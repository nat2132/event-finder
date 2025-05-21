import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarEvent } from "@/lib/calendar";
import type { SavedEvent } from "@/api/saved-events";

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: CalendarEvent;
  onSave: (event: Omit<CalendarEvent, "id">) => void;
  onDelete?: () => void;
  savedEvents: SavedEvent[];
  loadingSaved: boolean;
  savedError: string | null;
}

export function EventDialog({ open, onOpenChange, event, onSave, onDelete, savedEvents, loadingSaved, savedError }: EventDialogProps) {
  const isEditing = !!event;
  const [form, setForm] = useState<Omit<CalendarEvent, "id">>(
    event ? {
      title: event.title,
      date: event.date,
      durationMinutes: event.durationMinutes,
      location: event.location,
      category: event.category,
      description: event.description || "",
    } : {
      title: "",
      date: new Date().toISOString(),
      durationMinutes: 60,
      location: "",
      category: "Cultural",
      description: "",
    }
  );

  // Helper to extract event data from saved event (handles internal and external)
  function getEventData(se: any) {
    if (se.external_event_id && se.external_event_data) {
      return { ...se.external_event_data, id: se.external_event_id, source: se.external_event_data.source };
    }
    return se.event;
  }

  // When a saved event is selected, fill the form (supports internal & external)
  function handleImportSaved(saved: SavedEvent) {
    const event = getEventData(saved);
    setForm({
      title: event.title || '',
      date: event.date ? new Date(event.date).toISOString() : new Date().toISOString(),
      durationMinutes: event.durationMinutes || 60,
      location: event.location || '',
      category: event.category || 'Cultural',
      description: event.description || '',
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave(form);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] h-[600px] overflow-y-auto z-[99]  bg-background">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Event" : "Create Event"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Edit your calendar event." : "Add a new event to your calendar. Optionally import from your saved events."}
          </DialogDescription>
        </DialogHeader>
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Import from Saved Events</h3>
          {loadingSaved ? (
            <div>Loading saved events...</div>
          ) : savedError ? (
            <div className="text-red-500">{savedError}</div>
          ) : savedEvents.length === 0 ? (
            <div>No saved events found.</div>
          ) : (
            <div className="max-h-40 overflow-y-auto grid gap-2 mb-2">
              {savedEvents.map((saved) => (
                <Button
                  key={saved.id}
                  variant="outline"
                  className="w-full justify-start text-left"
                  onClick={() => handleImportSaved(saved)}
                >
                  <span className="font-medium">{saved.event.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground
">{saved.event.date ? new Date(saved.event.date).toLocaleString() : ""}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium mb-1">Title</label>
            <Input name="title" value={form.title} onChange={handleChange} required />
          </div>
          <div>
            <label className="block font-medium mb-1">Date & Time</label>
            <Input name="date" type="datetime-local" value={form.date.slice(0, 16)} onChange={handleChange} required />
          </div>
          <div>
            <label className="block font-medium mb-1">Duration (minutes)</label>
            <Input name="durationMinutes" type="number" min={15} max={1440} value={form.durationMinutes} onChange={handleChange} required />
          </div>
          <div>
            <label className="block font-medium mb-1">Location</label>
            <Input name="location" value={form.location} onChange={handleChange} required />
          </div>
          <div>
            <label className="block font-medium mb-1">Category</label>
            <Input name="category" value={form.category} onChange={handleChange} required />
          </div>
          <div>
            <label className="block font-medium mb-1">Description</label>
            <Textarea name="description" value={form.description} onChange={handleChange} />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            {isEditing && onDelete && (
              <Button type="button" variant="destructive" onClick={onDelete} className="mr-auto bg-red-500 text-primary-foreground hover:bg-red-600">
                Delete Event
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className=" hover:bg-slate-100 cursor-pointer">
              Cancel
            </Button>
            <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/80 cursor-pointer">{isEditing ? "Save Changes" : "Create Event"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
