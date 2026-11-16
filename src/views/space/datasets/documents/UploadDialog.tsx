import { Dialog } from "../Dialog";
import { UploadForm } from "./UploadForm";

export { checkFiles, MAX_BYTES, MAX_FILES } from "./UploadForm";

/** Compact version of the shared file upload flow. */
export function UploadDialog(props: {
  datasetName: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  return (
    <Dialog title="Add documents" onClose={props.onClose}>
      <UploadForm {...props} />
    </Dialog>
  );
}
