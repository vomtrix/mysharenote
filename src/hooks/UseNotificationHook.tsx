import { toast, ToastOptions } from 'react-toastify';

export type NotificationParams = {
  message: string;
  status?: number;
  code?: string;
  options?: ToastOptions;
};

export const useNotification = () => {
  const defaultOptions: any = {
    theme: 'dark',
    hideProgressBar: true,
    position: 'top-right'
  };
  const showSuccess = ({ message, options }: NotificationParams) => {
    toast.success(message, { ...defaultOptions, ...options });
  };

  const showError = ({ message, options }: NotificationParams) => {
    toast.error(message, { ...defaultOptions, ...options });
  };

  const showInfo = ({ message, options }: NotificationParams) => {
    toast.info(message, { ...defaultOptions, ...options });
  };

  const showWarning = ({ message, options }: NotificationParams) => {
    toast.warning(message, { ...defaultOptions, ...options });
  };

  return { showSuccess, showError, showInfo, showWarning };
};
