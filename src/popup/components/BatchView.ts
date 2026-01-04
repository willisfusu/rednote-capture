import { DetectedNote } from '../../models/batch-selection';

export class BatchView {
    private container: HTMLElement;
    private notes: DetectedNote[] = [];
    private selectedNoteIds: Set<string> = new Set();

    // Callbacks
    public onSelectionChange: (count: number) => void = () => { };
    public onProcess: (selectedIds: string[], merge: boolean) => void = () => { };
    public onRefresh: () => void = () => { };

    constructor(containerId: string) {
        const el = document.getElementById(containerId);
        if (!el) throw new Error(`Container ${containerId} not found`);
        this.container = el;
        this.bindGlobalEvents();
    }

    public setNotes(notes: DetectedNote[]) {
        this.notes = notes;

        // Preserve selection if possible, or reset? 
        // Usually keep existing selection if ID still exists
        const newIds = new Set(notes.map(n => n.noteId));

        // Remove IDs that are no longer in the list (unlikely in append scenarios but safe)
        for (const id of this.selectedNoteIds) {
            if (!newIds.has(id)) {
                this.selectedNoteIds.delete(id);
            }
        }

        this.render();
    }

    public render() {
        this.container.innerHTML = `
      <div class="batch-header">
        <h2>Found ${this.notes.length} notes</h2>
        <div class="batch-actions">
           <button id="btn-select-all" class="text-btn">Select All</button>
           <button id="btn-refresh" class="icon-btn" title="Refresh/Load More">↻</button>
        </div>
      </div>
      <div class="notes-grid">
        ${this.notes.map(note => this.renderNoteItem(note)).join('')}
      </div>
      <div class="batch-footer">
        <div class="batch-options">
           <label class="checkbox-wrapper">
             <input type="checkbox" id="chk-merge-pdf">
             <span class="custom-checkbox"></span>
             <span class="label-text">Merge into single PDF</span>
           </label>
        </div>
        <button id="btn-process-batch" class="btn btn-primary" ${this.selectedNoteIds.size === 0 ? 'disabled' : ''}>
          Generate PDFs (${this.selectedNoteIds.size})
        </button>
      </div>
    `;

        this.bindEvents();
    }

    private renderNoteItem(note: DetectedNote): string {
        const isSelected = this.selectedNoteIds.has(note.noteId);
        return `
      <div class="note-card ${isSelected ? 'selected' : ''}" data-id="${note.noteId}">
        <div class="checkbox ${isSelected ? 'checked' : ''}"></div>
        <img src="${note.coverUrl}" alt="Cover" />
        <div class="note-info">
          <div class="note-title">${note.title}</div>
        </div>
      </div>
    `;
    }

    private bindEvents() {
        // Select All
        this.container.querySelector('#btn-select-all')?.addEventListener('click', () => {
            const allSelected = this.notes.every(n => this.selectedNoteIds.has(n.noteId));
            if (allSelected) {
                this.selectedNoteIds.clear();
            } else {
                this.notes.forEach(n => this.selectedNoteIds.add(n.noteId));
            }
            this.render();
            this.onSelectionChange(this.selectedNoteIds.size);
        });

        // Refresh
        this.container.querySelector('#btn-refresh')?.addEventListener('click', () => {
            this.onRefresh();
        });

        // Process
        this.container.querySelector('#btn-process-batch')?.addEventListener('click', () => {
            const merge = (this.container.querySelector('#chk-merge-pdf') as HTMLInputElement).checked;
            this.onProcess(Array.from(this.selectedNoteIds), merge);
        });

        // Item Click (Delegation inside grid)
        const grid = this.container.querySelector('.notes-grid');
        if (grid) {
            grid.addEventListener('click', (e) => {
                const card = (e.target as HTMLElement).closest('.note-card');
                if (card) {
                    const id = card.getAttribute('data-id');
                    if (id) {
                        this.toggleSelection(id);
                    }
                }
            });
        }
    }

    private toggleSelection(id: string) {
        if (this.selectedNoteIds.has(id)) {
            this.selectedNoteIds.delete(id);
        } else {
            this.selectedNoteIds.add(id);
        }

        // Update only the specific card instead of re-rendering (preserves scroll position)
        const card = this.container.querySelector(`.note-card[data-id="${id}"]`);
        if (card) {
            const checkbox = card.querySelector('.checkbox');
            if (this.selectedNoteIds.has(id)) {
                card.classList.add('selected');
                checkbox?.classList.add('checked');
            } else {
                card.classList.remove('selected');
                checkbox?.classList.remove('checked');
            }
        }

        // Update button state
        this.updateFooterButton();
        this.onSelectionChange(this.selectedNoteIds.size);
    }

    private updateFooterButton() {
        const btn = this.container.querySelector('#btn-process-batch') as HTMLButtonElement;
        if (btn) {
            btn.disabled = this.selectedNoteIds.size === 0;
            btn.textContent = `Generate PDFs (${this.selectedNoteIds.size})`;
        }
    }

    private bindGlobalEvents() {
        // Add CSS styles dynamically if not present? 
        // Ideally styles should be in popup.css, but we can inject basic structure styles here if needed.
    }
}
