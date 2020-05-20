import { getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';
import TransctionsRepository from '../repositories/TransactionsRepository';

class DeleteTransactionService {
  public async execute(id: string): Promise<void> {
    // getCustomRepository utilizado quando temos um repositoryo customizado
    const transactionReposistory = getCustomRepository(TransctionsRepository);

    // Busca a transação pelo id
    const transaction = await transactionReposistory.findOne(id);

    // Verifica se a transação existe
    if (!transaction) {
      throw new AppError('Transaction does not exist');
    }

    // Deleta a transação do banco de dados
    await transactionReposistory.remove(transaction);
  }
}

export default DeleteTransactionService;
