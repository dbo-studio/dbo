'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  console.log(error);

  return <div>error</div>;
}
