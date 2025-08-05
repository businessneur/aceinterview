import { CONNECTION_STATUS } from './constants';

export const formatTime = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const getConnectionStatusColor = (status: string) => {
  switch (status) {
    case CONNECTION_STATUS.CONNECTED: 
      return 'text-green-600 bg-green-100';
    case CONNECTION_STATUS.CONNECTING: 
      return 'text-yellow-600 bg-yellow-100';
    case CONNECTION_STATUS.ERROR: 
      return 'text-red-600 bg-red-100';
    default: 
      return 'text-gray-600 bg-gray-100';
  }
};

export const getConnectionStatusText = (status: string) => {
  switch (status) {
    case CONNECTION_STATUS.CONNECTED: 
      return 'Voice Connected';
    case CONNECTION_STATUS.CONNECTING: 
      return 'Connecting...';
    case CONNECTION_STATUS.ERROR: 
      return 'Connection Error';
    default: 
      return 'Disconnected';
  }
};

// Local utility to convert snake_case keys to camelCase (shallow, for session object)
export const camelCaseSession = (obj: any): any => {
  if (!obj || typeof obj !== 'object') return obj;
  const toCamel = (s: string) =>
    s.replace(/([-_][a-z])/g, group =>
      group.toUpperCase().replace('-', '').replace('_', '')
    );
  const result: any = {};
  for (const key in obj) {
    result[toCamel(key)] = obj[key];
  }
  return result;
};