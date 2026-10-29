import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { Button, EmptyState } from '@/components/ui';

/** Shown instead of a blank screen if a page throws. */
export function RouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error) ? error.statusText : error instanceof Error ? error.message : '';
  return (
    <div className="grid min-h-screen place-items-center bg-canvas p-6">
      <EmptyState
        bordered
        icon="x"
        title="Something went wrong on this screen"
        message={detail}
        action={<Button onClick={() => window.location.assign('/')}>Back to Home</Button>}
        className="w-full max-w-md"
      />
    </div>
  );
}
