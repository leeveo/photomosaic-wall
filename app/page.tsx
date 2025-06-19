import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to the admin page on the same domain
  redirect('/admin');
}
