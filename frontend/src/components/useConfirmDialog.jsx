import { useCallback, useRef, useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@fluentui/react-components';

/**
 * Replaces window.confirm(). Native browser dialogs (confirm/alert/prompt)
 * can be silently blocked inside an embedded iframe — which is exactly what
 * a Teams tab is — depending on the host's sandbox permissions. This
 * renders as a normal in-page Fluent dialog instead, so it behaves
 * identically everywhere the app runs: a regular browser tab, or embedded
 * in Teams.
 *
 * Usage:
 *   const { confirm, dialog } = useConfirmDialog();
 *   ...
 *   if (!(await confirm('Delete this job?'))) return;
 *   if (!(await confirm('Duplicate this job?', { confirmLabel: 'Duplicate' }))) return;
 *   ...
 *   return <>{dialog}{...rest of the UI}</>;
 */
export function useConfirmDialog() {
  const [state, setState] = useState({ open: false, message: '', confirmLabel: 'Delete' });
  const resolveRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    setState({ open: true, message, confirmLabel: options.confirmLabel || 'Delete' });
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function handleResult(result) {
    setState((prev) => ({ ...prev, open: false }));
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  }

  const dialog = (
    <Dialog open={state.open} onOpenChange={(_, data) => !data.open && handleResult(false)}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogContent>{state.message}</DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => handleResult(false)}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={() => handleResult(true)}>
              {state.confirmLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );

  return { confirm, dialog };
}
