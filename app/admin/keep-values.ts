import { startTransition, type FormEvent } from 'react';

/**
 * Submit handler for forms using a server action. React clears a form after its
 * action runs; submitting this way keeps what was typed, so a validation error
 * doesn't wipe the form. Forms that should clear after success do it themselves.
 */
export function keepValues(dispatch: (form: FormData) => void, before?: (e: FormEvent<HTMLFormElement>) => boolean) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (before && !before(e)) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const form = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(form));
  };
}
