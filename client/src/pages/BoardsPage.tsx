import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ROLE_LABELS } from '../api/types';
import type { BoardSummary } from '../api/types';
import { AddForm } from '../components/AddForm';
import { AppHeader } from '../components/AppHeader';

export function BoardsPage() {
  const queryClient = useQueryClient();

  const boardsQuery = useQuery({
    queryKey: ['boards'],
    queryFn: () => api<{ boards: BoardSummary[] }>('/boards').then((data) => data.boards),
  });

  const createBoard = useMutation({
    mutationFn: (title: string) => api('/boards', { method: 'POST', body: { title } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['boards'] }),
  });

  return (
    <>
      <AppHeader />
      <main className="page">
        <h2>Meus quadros</h2>

        <AddForm
          placeholder="Nome do novo quadro"
          buttonLabel="Criar quadro"
          disabled={createBoard.isPending}
          onSubmit={(title) => createBoard.mutate(title)}
        />
        {createBoard.isError && <p className="errors">{createBoard.error.message}</p>}

        {boardsQuery.isPending && <p className="muted">Carregando...</p>}
        {boardsQuery.isError && <p className="errors">{boardsQuery.error.message}</p>}

        {boardsQuery.data &&
          (boardsQuery.data.length === 0 ? (
            <p className="muted">Você ainda não participa de nenhum quadro. Crie o primeiro!</p>
          ) : (
            <div className="boards-grid">
              {boardsQuery.data.map((board) => (
                <Link key={board.id} to={`/boards/${board.id}`} className="board-tile">
                  <strong>{board.title}</strong>
                  <br />
                  <span className="badge">{ROLE_LABELS[board.role]}</span>
                </Link>
              ))}
            </div>
          ))}
      </main>
    </>
  );
}