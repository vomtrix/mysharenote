import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ReduxDispatch, ReduxState } from '@store/store';

export const createAppAsyncThunk = createAsyncThunk.withTypes<{
  state: ReduxState;
  dispatch: ReduxDispatch;
  rejectValue: any;
}>();
