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

  // Handle admin links: /events/EVENT_ID/admin?token=ADMIN_TOKEN
  if (slug[1] === 'admin' && resolvedSearchParams.token) {
    redirectUrl += `&adminToken=${resolvedSearchParams.token}`;
  } 
  // Handle RSVP links: /events/EVENT_ID?token=RESPONDENT_TOKEN (for editing)
  // or /events/EVENT_ID (for new RSVP)
  else if (slug.length === 1 && resolvedSearchParams.token) {
    redirectUrl += `&respondentToken=${resolvedSearchParams.token}`;
  }

  redirect(redirectUrl);
}
