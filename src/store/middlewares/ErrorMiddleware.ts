import { Middleware } from '@reduxjs/toolkit';
import { useNotification } from '@hooks/UseNotificationHook';

const { showError } = useNotification();

export const errorMiddleware: Middleware = () => (next) => (action: any) => {
  if (action.type.endsWith('/rejected')) {
    const payload = action.payload;

    if (payload) {
      console.error(
        `[ERROR] Status: ${payload.status} | Code: ${payload.code} | Message: ${payload.message}`
      );
      showError({
        message: payload.message,
        options: {
          position: 'bottom-center'
        }
      });
    }
  }

  return next(action);
};
