import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import Categories from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const contactsReadStream = fs.createReadStream(filePath);

    const categoriesRepository = getRepository(Categories);

    const transactionsRepository = getCustomRepository(TransactionsRepository);

    // from_line inicia os dados da linha 2
    const parsers = csvParse({
      from_line: 2,
    });

    // pipe vai lendo as linhas que estão disponíveis para leitura
    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    // Mapeia o arquivo .CSV
    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      // Verifica se existe algum valor vazio
      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    // Criado promise para aguardar o final da leitura do arquivo
    await new Promise(resolve => parseCSV.on('end', resolve));

    // Verifica se existe a categoria dentro do banco de dados
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    // Pega o título das categorias existentes
    const existentCategoriesTitles = existentCategories.map(
      (category: Categories) => category.title,
    );

    // Retorna todas as categorias que não existem no banco de dados
    // segundo filter remove as categorias duplicadas
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    // Cria objeto de categorias
    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    // Salva as categorias no banco de dados
    await categoriesRepository.save(newCategories);

    // Criar array com todas as categorias
    const finalCategories = [...newCategories, ...existentCategories];

    // Cria objeto de transações
    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    // Salva as transações no banco de dados
    await transactionsRepository.save(createdTransactions);

    // Excluir o arquivo local
    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
