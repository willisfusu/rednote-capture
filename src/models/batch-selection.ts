export interface BatchSelection {
    profileId: string;
    selectedNotes: string[]; // Note IDs
    totalDetected: number;
}

export interface DetectedNote {
    noteId: string;
    title: string;
    coverUrl: string;
    noteUrl: string;
    selected?: boolean;
}
