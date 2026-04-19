import { redirect } from 'next/navigation';

interface EventsCatchAllPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// This page's purpose is to catch incoming event URLs (admin or rsvp)
// and redirect them to the main page with query params.
// The main page will then parse these params and open the correct tab.
export default async function EventsCatchAllPage({ params, searchParams }: EventsCatchAllPageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  
  if (!slug || slug.length === 0) {
    redirect('/');
  }

  const eventId = slug[0];
  let redirectUrl = `/?eventId=${eventId}`;

  // Check for admin links, e.g., /events/EVENT_ID/admin?token=TOKEN
  if (slug[1] === 'admin' && resolvedSearchParams.token) {
    redirectUrl += `&adminToken=${resolvedSearchParams.token}`;
  }
  
  // Later, we can add logic for RSVP links, e.g., /events/EVENT_ID
  // For now, it just opens a tab for that event.

  redirect(redirectUrl);
}
