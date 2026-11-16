import { deleteDocument } from "../../../../services/api";

/** Shared confirmation for deletion from a row or the document editor. */
export async function confirmDeleteDocument(datasetName: string, documentId: string) {
  if (!window.confirm("Delete this document? To keep it but hide it from search, disable it."))
    return false;
  await deleteDocument(datasetName, documentId);
  return true;
}
