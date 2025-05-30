import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import dayjs, { Dayjs } from "dayjs";
import {
  Check,
  Edit2,
  Trash2,
  Folder,
  Music,
  Plus,
  ArrowRight,
} from "lucide-react";
import { CreatePlaylistItemResponseSchema, Spotify } from "./api";

enum ItemStatus {
  Staging = "staging",
  Created = "created",
  Inflight = "inflight",
  Error = "error",
}

const zodDay = z.custom<Dayjs>((val) => dayjs.isDayjs(val), "Invalid date");

const APP_NAME = "Playlist Tools";

const StagingItem = z.object({
  id: z.string(),
  name: z.string().min(1, "Playlist name is required"),
  status: z.literal(ItemStatus.Staging),
  createdAt: zodDay,
});

const ErrorItem = StagingItem.extend({
  status: z.literal(ItemStatus.Error),
  error: z.object({
    message: z.string(),
  }),
});

const CreatedItem = StagingItem.extend({
  status: z.literal(ItemStatus.Created),
  playlist: CreatePlaylistItemResponseSchema,
});

const InflightItem = StagingItem.extend({
  status: z.literal(ItemStatus.Inflight),
  inflightAt: zodDay,
});

const FormItemSchema = z.discriminatedUnion("status", [
  StagingItem,
  InflightItem,
  CreatedItem,
  ErrorItem,
]);

const PlaylistCreationSchema = z.object({
  items: z.array(FormItemSchema),
  textInput: z.string(),
  selectedFolder: z.string(),
  description: z.string().optional(),
  isPublic: z.boolean(),
  isCollaborative: z.boolean(),
});

type FormValues = z.infer<typeof PlaylistCreationSchema>;

const getId = () => Math.random().toString(36).substr(2, 9);

const App = () => {
  const queryClient = useQueryClient();
  const [api] = useState(
    new Spotify(
      import.meta.env.VITE_CLIENT_ID,
      import.meta.env.VITE_REDIRECT_URI
    )
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    setValue,
    getValues,
  } = useForm<FormValues>({
    resolver: zodResolver(PlaylistCreationSchema),
    defaultValues: {
      items: [],
      textInput: "",
      selectedFolder: "root",
      description: `Created with ${APP_NAME} - ${dayjs().format(
        "MMM D, YYYY"
      )}`,
      isPublic: false,
      isCollaborative: false,
    },
  });

  const { fields, append, update, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedTextInput = watch("textInput");
  const watchedItems = watch("items");

  // Fetch user profile
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => api.getMe(),
    enabled: api.isAuthenticated,
    retry: false,
  });

  // Fetch folders
  const { data: folders = [] } = useQuery({
    queryKey: ["folders"],
    queryFn: () => api.getFolders(),
    enabled: api.isAuthenticated,
  });

  // Handle adding items on Enter key
  const handleAddItem = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const inputValue = watchedTextInput.trim();

      if (!inputValue) return;

      const currentItems = getValues("items");
      const existingNames = new Set(currentItems.map((item) => item.name));

      if (!existingNames.has(inputValue)) {
        append({
          id: getId(),
          name: inputValue,
          status: ItemStatus.Staging,
          createdAt: dayjs(),
        });
      }

      setValue("textInput", "");
    }
  };

  const handleEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditValue(name);
  };

  const handleSaveEdit = (index: number) => {
    if (editValue.trim()) {
      update(index, { ...fields[index], name: editValue.trim() });
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleDelete = (index: number) => {
    remove(index);
  };

  const createPlaylistsMutation = useMutation({
    mutationFn: async (formData: FormValues) => {
      if (!userProfile?.id || !api.isAuthenticated) {
        throw new Error("User not authenticated");
      }

      const stagingItems = formData.items.filter(
        (item) => item.status === ItemStatus.Staging
      );

      for (let i = 0; i < stagingItems.length; i++) {
        const item = stagingItems[i];
        if (item.status !== ItemStatus.Staging)
          throw new Error("WTF: item was not ready for creation");
        const itemIndex = formData.items.findIndex(
          (existing) => existing.id === item.id
        );
        item;

        // Update status to creating so we can show loading status
        update(itemIndex, {
          ...item,
          status: ItemStatus.Inflight,
          inflightAt: dayjs(),
        });

        try {
          const playlist = await api.createPlaylist({
            userId: userProfile.id,
            name: item.name,
            description:
              formData.description ||
              `Created with ${APP_NAME} - ${dayjs().format("PPP")}`,
            isPublic: formData.isPublic,
            isCollaborative: formData.isCollaborative,
          });

          // Update status to created
          update(itemIndex, {
            ...item,
            status: ItemStatus.Created,
            createdAt: dayjs(),
            playlist,
          });
        } catch (error) {
          update(itemIndex, {
            ...item,
            status: ItemStatus.Error,
            error,
          });
        }

        // Small delay between creations
        if (i < stagingItems.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
        }
      }
    },
  });

  const onSubmit = (data: FormValues) => {
    createPlaylistsMutation.mutate(data);
  };

  const stagingItems = watchedItems.filter((item) => item.status === "staging");
  const canCreate =
    stagingItems.length > 0 && !createPlaylistsMutation.isPending;

  if (!api.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-gray-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">{APP_NAME}</h1>
          <p className="text-gray-600 mb-6">
            Connect your Spotify account to create playlists
          </p>
          <button
  onClick={() => {
    const href = api.getAuthUrl([
      "playlist-modify-public",
      "playlist-modify-private",
    ]);

    const width = 500;
    const height = 600;
    const left = window.screenX + (window.innerWidth - width) / 2;
    const top = window.screenY + (window.innerHeight - height) / 2;

    window.open(
      href,
      "SpotifyAuth",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  }}
  className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
>
  Connect to Spotify
</button>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-green-500 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-700 text-white p-6">
            <div className="flex items-center gap-3">
              <Music className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">{APP_NAME}</h1>
                <p className="opacity-90">
                  Welcome back, {userProfile?.display_name}
                </p>
              </div>
            </div>
          </div>

          <div onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Folder Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Folder className="w-4 h-4 inline mr-1" />
                Destination Folder
              </label>
              <select
                {...register("selectedFolder")}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              >
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.path}
                  </option>
                ))}
              </select>
            </div>

            {/* Input for Adding Playlists */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Playlist Names
              </label>
              <input
                type="text"
                {...register("textInput")}
                onKeyDown={handleAddItem}
                placeholder="Type a playlist name and press Enter..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              />
              <p className="text-sm text-gray-500 mt-1">
                Press Enter to add each playlist name to the staging area below
              </p>
            </div>

            {/* Playlist Items List */}
            {fields.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Playlist Staging Area ({stagingItems.length} ready to create)
                </label>
                <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {fields.map((field, index) => {
                    const item = watchedItems[index];
                    const isEditing = editingId === field.id;

                    return (
                      <div
                        key={field.id}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                          item.status === "staging"
                            ? "bg-white border-2 border-gray-200"
                            : item.status === ItemStatus.Inflight
                            ? "bg-yellow-50 border-2 border-yellow-200"
                            : item.status === "created"
                            ? "bg-green-50 border-2 border-green-200"
                            : "bg-red-50 border-2 border-red-200"
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {item.status === ItemStatus.Staging && (
                            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                              <Plus className="w-3 h-3 text-gray-600" />
                            </div>
                          )}
                          {item.status === ItemStatus.Inflight && (
                            <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                              <div className="w-3 h-3 border-2 border-yellow-700 border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                          {item.status === ItemStatus.Created && (
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                          {item.status === ItemStatus.Error && (
                            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                              <span className="text-white text-xs font-bold">
                                !
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Name/Input */}
                        <div className="flex-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveEdit(index);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              className="w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                              autoFocus
                            />
                          ) : (
                            <div>
                              <span
                                className={`font-medium ${
                                  item.status === "created"
                                    ? "text-green-800"
                                    : item.status === "error"
                                    ? "text-red-800"
                                    : "text-gray-800"
                                }`}
                              >
                                {item.name}
                              </span>
                              {item.status === "error" && (
                                <p className="text-sm text-red-600 mt-1">
                                  {item.error.message}
                                </p>
                              )}
                              {item.status === "created" && (
                                <p className="text-sm text-green-600 mt-1">
                                  ✓ Created successfully
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-1">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(index)}
                                className="p-1 text-green-600 hover:bg-green-100 rounded"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                              >
                                ×
                              </button>
                            </>
                          ) : (
                            <>
                              {item.status === "staging" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEdit(field.id, item.name)
                                  }
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              {item.status === "staging" && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(index)}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Playlist Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register("description")}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors min-h-20 resize-y"
                />
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register("isPublic")}
                    className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Make playlists public
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    {...register("isCollaborative")}
                    className="w-5 h-5 text-green-500 rounded focus:ring-2 focus:ring-green-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Make playlists collaborative
                  </span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleSubmit(onSubmit)()}
                disabled={!canCreate}
                className={`px-8 py-3 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                  canCreate
                    ? "bg-green-500 hover:bg-green-600 text-white shadow-lg hover:shadow-xl"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {createPlaylistsMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create {stagingItems.length} Playlist
                    {stagingItems.length !== 1 ? "s" : ""}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
