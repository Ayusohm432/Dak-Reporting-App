import { useEffect } from 'react';
import { router } from 'expo-router';

export default function CreateTabRedirect() {
  useEffect(() => {
    router.replace('/reports/new');
  }, []);

  return null;
}
