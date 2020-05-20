import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    // getCustomRepository utilizado quando temos um repositoryo customizado
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    // getRepository utilizado para criar o repositório vinculado ao modelo Category
    const categoryRepository = getRepository(Category);

    // Recupera o valor total do balance
    const { total } = await transactionsRepository.getBalance();

    // Verifica se a transação de saída é maior que o valor total
    if (type === 'outcome' && total < value) {
      throw new AppError('You do not have enough balance');
    }

    // Verifica se existe a categoria no banco de dados e retorna um registro
    let transactionCategory = await categoryRepository.findOne({
      where: {
        title: category,
      },
    });

    // Verifica se a transação não existe e cria nova
    if (!transactionCategory) {
      transactionCategory = categoryRepository.create({
        title: category,
      });

      await categoryRepository.save(transactionCategory);
    }

    // Cria nova transação no banco de dados
    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category: transactionCategory,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
