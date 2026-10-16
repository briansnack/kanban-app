import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { api } from '../api/client';
import type { List } from '../api/types';
import { AddForm } from './AddForm';

interface ListColumnProps {
  list: List;
  canEdit: boolean;
  boardQueryKey: QueryKey;
}

export function ListColumn({ list, canEdit, boardQueryKey }: ListColumnProps) {
  const queryClient = useQueryClient();

  const addCard = useMutation({
    mutationFn: (title: string) =>
      api(`/lists/${list.id}/cards`, { method: 'POST', body: { title } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardQueryKey }),
  });

  return (
    <section className="column">
      <h3>{list.title}</h3>

      {list.cards.map((card) => (
        <article key={card.id} className="card">
          <strong>{card.title}</strong>
          {card.description && <p>{card.description}</p>}
          {card.due_date && (
            <span className="due">
              Prazo: {new Date(card.due_date).toLocaleDateString('pt-BR')}
            </span>
          )}
        </article>
      ))}

      {canEdit && (
        <AddForm
          placeholder="Novo card"
          buttonLabel="Adicionar"
          disabled={addCard.isPending}
          onSubmit={(title) => addCard.mutate(title)}
        />
      )}
    </section>
  );
}