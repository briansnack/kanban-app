import { useState } from 'react';
import type { FormEvent } from 'react';

interface AddFormProps {
  placeholder: string;
  buttonLabel: string;
  disabled?: boolean;
  onSubmit: (title: string) => void;
}

export function AddForm({ placeholder, buttonLabel, disabled = false, onSubmit }: AddFormProps) {
  const [title, setTitle] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setTitle('');
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder={placeholder}
        maxLength={200}
      />
      <button type="submit" disabled={disabled}>
        {buttonLabel}
      </button>
    </form>
  );
}