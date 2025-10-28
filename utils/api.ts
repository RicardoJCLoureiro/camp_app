// utils/api.ts
import axios, { AxiosInstance } from 'axios';
import { useEffect }           from 'react';
import { useLoading }          from '@/context/LoadingContext';

const baseApi: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true,  // send & receive HttpOnly cookie
});

export function useApi(): AxiosInstance {
  const { setLoading } = useLoading();

  useEffect(() => {
    const reqEject = baseApi.interceptors.request.use(
      config => { setLoading(true);  return config; },
      error  => { setLoading(false); return Promise.reject(error); }
    );
    const resEject = baseApi.interceptors.response.use(
      response => { setLoading(false); return response; },
      error    => { setLoading(false); return Promise.reject(error); }
    );
    return () => {
      baseApi.interceptors.request.eject(reqEject);
      baseApi.interceptors.response.eject(resEject);
    };
  }, [setLoading]);

  return baseApi;
}
