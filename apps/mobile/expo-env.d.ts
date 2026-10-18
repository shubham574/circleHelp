/// <reference types="expo/types" />

// NOTE: This file should not be edited and should be in your git ignore
declare const process: {
  env: {
    NODE_ENV?: string;
    EXPO_PUBLIC_API_URL?: string;
    [key: string]: string | undefined;
  };
};
