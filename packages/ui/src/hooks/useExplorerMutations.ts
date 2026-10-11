import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  api,
  type FileUpdate,
  type FolderCreate,
  type FolderUpdate,
} from "@workspace/contracts"

export function useExplorerMutations(courseId: string) {
  const queryClient = useQueryClient()
  const uploadFileMutation = useMutation({
    mutationFn: ({
      folderId,
      file,
      onProgress,
    }: {
      folderId: string
      file: File
      onProgress?: (fraction: number) => void
    }) => api.files.upload(folderId, file, onProgress),

    // Not awaited: the upload is finished when the API answers, and the
    // modal should say so then, not after the file list has been refetched.
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["courses", courseId, "files"],
      })
    },
  })

  const updateFileMutation = useMutation({
    mutationFn: ({ fileId, data }: { fileId: string; data: FileUpdate }) =>
      api.files.update(fileId, data),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", courseId, "files"],
      })
    },
  })

  const deleteFileMutation = useMutation({
    mutationFn: (fileId: string) => api.files.delete(fileId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", courseId, "files"],
      })
    },
  })

  const ingestFileMutation = useMutation({
    mutationFn: (fileId: string) => api.files.ingest(fileId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", courseId, "files"],
      })
    },
  })

  const createFolderMutation = useMutation({
    mutationFn: (data: FolderCreate) => api.folders.create(courseId, data),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", courseId, "folders"],
      })
    },
  })

  const updateFolderMutation = useMutation({
    mutationFn: ({
      folderId,
      data,
    }: {
      folderId: string
      data: FolderUpdate
    }) => api.folders.update(courseId, folderId, data),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", courseId, "folders"],
      })
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => api.folders.delete(courseId, folderId),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["courses", courseId, "folders"],
      })
    },
  })
  return {
    uploadFileMutation,
    updateFileMutation,
    deleteFileMutation,
    ingestFileMutation,
    createFolderMutation,
    updateFolderMutation,
    deleteFolderMutation,
  }
}
