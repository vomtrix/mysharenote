import { Subject, merge, timer } from 'rxjs';
import { debounceTime, take, takeUntil } from 'rxjs/operators';

export const setupLoaderOnIdle = (idleMs: number, stop: () => void) => {
  const events$ = new Subject<void>();

  merge(timer(idleMs).pipe(takeUntil(events$)), events$.pipe(debounceTime(idleMs)))
    .pipe(take(1))
    .subscribe(stop);

  return {
    onEvent: () => events$.next(),
    complete: () => events$.complete()
  };
};
