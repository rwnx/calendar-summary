import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Api } from './api';

const api = new Api();
const refreshInterval = dayjs.duration({seconds: 5})

const Spinner: React.FC = () => (
  <span className="spinner">💢</span>
);

const App: React.FC = () => {
  const { data, isLoading, error, isError, isFetching } = useQuery({
    queryKey: ['iss-now'],
    queryFn: () => api.getData(),
    refetchInterval: refreshInterval.asMilliseconds()
  });

  const [countdown, setCountdown] = useState<number>(refreshInterval.asSeconds());
  useEffect(() => {
    const id = setInterval(() => setCountdown((s) => (s <= 1 ? refreshInterval.asSeconds() : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  if (isLoading) return <div>Loading... <Spinner /></div>;
  if (isError) return <div>Error: {error instanceof Error ? error.message : 'Unknown'}</div>;
  if (!data) throw new Error("Data is missing (unreachable)")

  return (
    <div>
      <h2>🚀 {import.meta.env.VITE_TITLE} ({import.meta.env.MODE})</h2>
      <p>Time: {data.timestamp.format('hh:mm a')}</p>
      <p>Lat: {data.iss_position.latitude}</p>
      <p>Lng: {data.iss_position.longitude}</p>
      <p>Refreshing {isFetching ? <Spinner /> : <>in {countdown}s</>}</p>
    </div>
  );
};

export default App;
