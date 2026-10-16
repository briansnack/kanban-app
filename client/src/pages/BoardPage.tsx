import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { ROLE_LABELS } from '../api/types';
import type { BoardDetail } from '../api/types';
import { AddForm } from '../components/AddForm';
import { AppHeader } from '../components/AppHeader';
import { ListColumn } from '../components/ListColumn';

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();
  const queryKey = ['board', boardId];

  const boardQuery = useQuery({
    queryKey,
    queryFn: () => api<{ board: BoardDetail }>(`/boards/${boardId}`).then((data) => data.board),
    enabled: Boolean(boardId),
  });

  const addList = useMutation({
    mutationFn: (title: string) =>
      api(`/boards/${boardId}/lists`, { method: 'POST', body: { title } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  if (boardQuery.isPending) {
    return (
      <>
        <AppHeader />
        <p className="center-message">Carregando...</p>
      </>
    );
  }

  if (boardQuery.isError) {
    return (
      <>
        <AppHeader />
        <main className="page">
          <p className="errors">{boardQuery.error.message}</p>
          <Link to="/">← Voltar para os quadros</Link>
        </main>
      </>
    );
  }

  const board = boardQuery.data;
  const canEdit = board.role === 'owner' || board.role === 'editor';

  return (
    <>
      <AppHeader />
      <div className="board-header">
        <Link to="/">← Quadros</Link>
        <h2>{board.title}</h2>
        <span className="badge">{ROLE_LABELS[board.role]}</span>
      </div>

      <main className="board-columns">
        {board.lists.map((list) => (
          <ListColumn key={list.id} list={list} canEdit={canEdit} boardQueryKey={queryKey} />
        ))}

        {canEdit && (
          <div className="column">
            <AddForm
              placeholder="Nova lista"
              buttonLabel="Adicionar"
              disabled={addList.isPending}
              onSubmit={(title) => addList.mutate(title)}
            />
          </div>
        )}
      </main>
    </>
  );
}