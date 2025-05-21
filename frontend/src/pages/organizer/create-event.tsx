import React, { useState} from "react"
import { uploadEventImage, createEvent } from "./event-api";
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@clerk/clerk-react"
import { motion } from "framer-motion"
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, ImageIcon, MapPin, Ticket } from "lucide-react" // Added ClipboardCheck icon
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { DashboardLayout } from "@/components/organizer/dashboard-layout"

const steps = [
  { id: "basic-info", title: "Basic Info", icon: Check },
  { id: "date-location", title: "Location", icon: MapPin },
  { id: "tickets", title: "Tickets", icon: Ticket },
  { id: "media", title: "Media", icon: ImageIcon },
  { id: "review", title: "Review", icon: ClipboardCheck }, // Added Review step
]

import { toast } from "@/hooks/use-toast";
import axios from "axios";
import { fetchEventById } from "./event-api";

interface CreateEventPageProps {
  editEvent?: { 
    id: string; 
    title: string; 
    description: string; 
    category: string; 
    date: string; 
    time: string; 
    location: string; 
    address: string; 
    ticketTypes: { name: string; price: string; quantity: string }[]; 
    image?: string; 
    start_time?: string;
    end_time?: string;
  }; // Accepts EventDisplay or EventType
  onClose?: () => void;
}

// Add start_time and end_time to the form data type
interface EventFormData {
  title: string;
  description: string;
  category: string;
  customCategory: string;
  date: string;
  time: string;
  location: string;
  address: string;
  ticketTypes: { name: string; price: string; quantity: string }[];
  image?: string;
  start_time?: string;
  end_time?: string;
}

export default function CreateEventPage({ editEvent, onClose }: CreateEventPageProps) {
  const location = useLocation();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  // Support edit mode via query param
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editEventState, setEditEventState] = useState<CreateEventPageProps["editEvent"] | null>(() => editEvent || null);

  // Grab eventId from query string if present
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const eventId = params.get("id");
    if (eventId && !editEventState) {
      setLoadingEvent(true);
      setFetchError(null);
      getToken()
        .then(token => fetchEventById(eventId, token || undefined))
        .then(event => setEditEventState(event))
        .catch(() => setFetchError("Could not load event details."))
        .finally(() => setLoadingEvent(false));
    }
  }, [location.search, editEventState, getToken]);

  // Initial form state
  const isEditMode = !!editEventState;
  const [formData, setFormData] = useState<EventFormData>(() => {
    if (editEventState) {
      return {
        title: editEventState.title || "",
        description: editEventState.description || "",
        category: editEventState.category || "conference",
        customCategory: "",
        date: editEventState.date || "",
        time: editEventState.time || "",
        location: editEventState.location || "",
        address: editEventState.address || "",
        ticketTypes: editEventState.ticketTypes || [{ name: "General Admission", price: "0", quantity: "100" }],
        image: editEventState.image || undefined,
        start_time: editEventState.start_time || "",
        end_time: editEventState.end_time || "",
      };
    }
    return {
      title: "",
      description: "",
      category: "conference",
      customCategory: "",
      date: "",
      time: "",
      location: "",
      address: "",
      ticketTypes: [{ name: "General Admission", price: "0", quantity: "100" }],
      image: undefined as string | undefined,
      start_time: "",
      end_time: "",
    };
  });

  // If editEventState changes (e.g. after fetch), update formData
  React.useEffect(() => {
    if (editEventState) {
      // Convert ISO string to 'YYYY-MM-DDTHH:mm' for datetime-local input
      const formatForInput = (iso?: string) => {
        if (!iso) return "";
        const d = new Date(iso);
        // Pad month, day, hours, minutes
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      setFormData({
        title: editEventState.title || "",
        description: editEventState.description || "",
        category: editEventState.category || "conference",
        customCategory: "",
        date: editEventState.date || "",
        time: editEventState.time || "",
        location: editEventState.location || "",
        address: editEventState.address || "",
        ticketTypes: editEventState.ticketTypes || [{ name: "General Admission", price: "0", quantity: "100" }],
        image: editEventState.image || undefined,
        start_time: formatForInput(editEventState.start_time),
        end_time: formatForInput(editEventState.end_time),
      });
      // Set previews for cover and gallery images when editing
      setCoverImagePreview(editEventState.image || "");
    }
  }, [editEventState]);

  // Loading and error display
  // New state for images
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string>("");

  if (loadingEvent) {
    return <div className="flex flex-col items-center justify-center h-full"><span>Loading event data...</span></div>;
  }
  if (fetchError) {
    return <div className="flex flex-col items-center justify-center h-full text-red-500"><span>{fetchError}</span></div>;
  }

  // Handlers for cover image
  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCoverImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCoverImagePreview("");
      setCoverImageFile(null);
      setFormData((prev) => ({ ...prev, image: "" }));
    }
    // Clear the file input value to allow re-selecting the same file
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveCoverImage = () => {
    setCoverImagePreview("");
    setFormData((prev) => ({ ...prev, image: "" }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCategoryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, category: value }))
    if (value !== "other") {
      setFormData((prev) => ({ ...prev, customCategory: "" }))
    }
  }

  const handleTicketChange = (index: number, field: string, value: string) => {
    const updatedTickets = [...formData.ticketTypes]
    updatedTickets[index] = { ...updatedTickets[index], [field]: value }
    setFormData((prev) => ({ ...prev, ticketTypes: updatedTickets }))
  }

  const addTicketType = () => {
    setFormData((prev) => ({
      ...prev,
      ticketTypes: [...prev.ticketTypes, { name: "", price: "", quantity: "" }],
    }))
  }

  const removeTicketType = (index: number) => {
    const updatedTickets = [...formData.ticketTypes]
    updatedTickets.splice(index, 1)
    setFormData((prev) => ({ ...prev, ticketTypes: updatedTickets }))
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      // Submit form to backend
      (async () => {
        try {
          setIsSubmitting(true);
          if (isEditMode && editEventState) {
            // Update event logic
            const token = await getToken();
            // Generate start_time and end_time from date and time fields
            let start_time = undefined;
            let end_time = undefined;
            if (formData.date && formData.time) {
              const isoStart = new Date(`${formData.date}T${formData.time}`).toISOString();
              start_time = isoStart;
              // For now, set end_time to 2 hours after start_time
              const end = new Date(new Date(isoStart).getTime() + 2 * 60 * 60 * 1000).toISOString();
              end_time = end;
            }
            // Remove customCategory from payload
            const { customCategory, ...editPayload } = formData;
            const payload = {
              ...editPayload,
              category: formData.category === "other" && formData.customCategory ? formData.customCategory : formData.category,
              start_time,
              end_time,
            };
            await axios.put(`/api/events/${editEventState.id}/`, payload, {
              headers: { Authorization: `Bearer ${token}` },
            });
            toast({ title: 'Event Updated', description: 'Event was updated successfully.' });
            if (onClose) onClose();
            return;
          }
          // Validate required fields
          if ((!coverImageFile && (!formData.image || formData.image.trim() === ""))) {
            toast({
              title: 'Cover image required',
              description: 'Please upload a cover image before submitting.',
              variant: 'destructive',
            });
            return;
          }
          if (!formData.description || !formData.location) {
            toast({
              title: 'Missing Required Fields',
              description: 'Description and Location are required.',
              variant: 'destructive',
            });
            return;
          }
          const API_BASE = "http://localhost:8000";
          // Real image upload logic
          let normalizedImage = formData.image;

          const token = await getToken();
          if (!token) throw new Error('Not authenticated');

          // Upload cover image if file selected
          if (coverImageFile) {
            try {
              console.log('Uploading cover image...');
              const uploadedUrl = await uploadEventImage(coverImageFile, token);
              console.log('Cover image uploaded:', uploadedUrl);
              // Validate URL
              if (!uploadedUrl || (!uploadedUrl.startsWith('http') && !uploadedUrl.startsWith('/media/'))) {
                toast({ title: 'Cover image upload failed', description: 'Invalid image URL returned from server.', variant: 'destructive' });
                setIsSubmitting(false);
                return;
              }
              // Prepend backend host if URL is relative
              normalizedImage = uploadedUrl.startsWith('/media/') ? `http://localhost:8000${uploadedUrl}` : uploadedUrl;
              console.log('DEBUG: normalizedImage after upload:', normalizedImage, 'type:', typeof normalizedImage);
              setFormData(prev => ({ ...prev, image: normalizedImage }));
            } catch (error) {
              console.error('Cover image upload failed:', error);
              toast({ title: 'Event creation failed', description: 'Something went wrong. Please try again.', variant: 'destructive' });
              setIsSubmitting(false);
              return;
            }
          }
          // Log event data before submission
          console.log('Submitting event with:', {
            ...formData,
            image: formData.image, // always just the URL
          });
          // Extra debug: check that image is a valid URL
          if (!normalizedImage || (typeof normalizedImage === 'string' && !normalizedImage.startsWith('http') && !normalizedImage.startsWith('/media/'))) {
            toast({ title: 'Cover image error', description: 'Cover image is not a valid URL.', variant: 'destructive' });
            setIsSubmitting(false);
            return;
          }

          // Use explicit start_time and end_time from form if provided, otherwise fall back to date/time fields
          let start_time = formData.start_time;
          let end_time = formData.end_time;
          if ((!start_time || !end_time) && formData.date && formData.time) {
            const isoStart = new Date(`${formData.date}T${formData.time}`).toISOString();
            start_time = start_time || isoStart;
            // For now, set end_time to 2 hours after start_time if not provided
            const end = new Date(new Date(isoStart).getTime() + 2 * 60 * 60 * 1000).toISOString();
            end_time = end_time || end;
          }
          // Remove customCategory from payload
          const { customCategory, ...formDataWithoutCustomCategory } = formData;
          const eventData = {
            ...formDataWithoutCustomCategory,
            category: formData.category === "other" ? formData.customCategory : formData.category,
            start_time,
            end_time,
            image: typeof normalizedImage === 'string' ? normalizedImage : '',
          };
          // Debug: log what is sent to backend
          console.log('Submitting eventData:', eventData);
          console.log('Submitting event data:', eventData);
          // Extra debug: show types and values
          console.log('image value:', eventData.image, 'image type:', typeof eventData.image);
          await createEvent(eventData, token);
          navigate("/dashboard/organizer/my-events", { state: { refresh: true } });
        } catch (err) {
          toast({
            title: isEditMode ? 'Event Update Failed' : 'Event Creation Failed',
            description: isEditMode ? 'Failed to update event. Please try again.' : 'Failed to create event. Please try again.',
            variant: 'destructive',
          });
          console.error(err);
        }
      })();
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4 flex flex-col w-full">
            <div className="grid gap-2">
              <Label htmlFor="title">Event Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g., Summer Music Festival"
                

                value={formData.title ?? ""}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Event Description</Label>
              <Textarea
                id="description"
                name="description"
                

                placeholder="Describe your event..."
                rows={5}
                value={formData.description ?? ""}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="start_time">Start Time</Label>
                <Input
                  id="start_time"
                  name="start_time"
                  type="datetime-local"
                  

                  value={formData.start_time ?? ""}
                  onChange={handleInputChange}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="end_time">End Time</Label>
                <Input
                  id="end_time"
                  name="end_time"
                  type="datetime-local"
                  

                  value={formData.end_time ?? ""}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Event Category</Label>
              <RadioGroup
                value={formData.category}
                onValueChange={handleCategoryChange}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="conference" id="conference" className="peer sr-only" />
                  <Label
                    htmlFor="conference"
                    className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span>Conference</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="concert" id="concert" className="peer sr-only" />
                  <Label
                    htmlFor="concert"
                    className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span>Concert</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="workshop" id="workshop" className="peer sr-only" />
                  <Label
                    htmlFor="workshop"
                    className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span>Workshop</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="other" id="other" className="peer sr-only" />
                  <Label
                    htmlFor="other"
                    className="flex cursor-pointer flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span>Other</span>
                  </Label>
                </div>
              </RadioGroup>
              {formData.category === "other" && (
                <div className="grid gap-2 mt-2">
                  <Label htmlFor="customCategory">Custom Category Name</Label>
                  <Input
                    id="customCategory"
                    name="customCategory"
                    placeholder="Enter custom category"
                    value={formData.customCategory}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              )}
            </div>
          </div>
        )
      case 1:
        return (
          <div className="space-y-4 flex flex-col w-full">
            <div className="grid gap-2">
              <Label htmlFor="location">Venue Name</Label>
              <Input
                id="location"
                name="location"
                placeholder="e.g., Central Park"
                value={formData.location ?? ""}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                name="address"
                placeholder="Full address of the venue"
                value={formData.address}
                onChange={handleInputChange}
              />
            </div>
          </div>
        )
      case 2:
        return (
            <div className="space-y-4 flex flex-col w-full">
            {formData.ticketTypes.map((ticket: { name: string; price: string; quantity: string }, index: number) => (
              <div key={index} className="rounded-lg border p-4 ">
              <div className="mb-4 flex flex-wrap items-center justify-between">
                <h4 className="font-medium mb-2 sm:mb-0">Ticket Type #{index + 1}</h4>
                {formData.ticketTypes.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTicketType(index)}
                  className="h-8 text-destructive hover:text-destructive"
                >
                  Remove
                </Button>
                )}
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                <Label htmlFor={`ticket-name-${index}`}>Ticket Name</Label>
                <Input
                  id={`ticket-name-${index}`}
                  placeholder="e.g., General Admission"
                  

                  value={ticket.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTicketChange(index, "name", e.target.value)}
                />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor={`ticket-price-${index}`}>Price ($)</Label>
                  <Input
                  id={`ticket-price-${index}`}
                  type="number"
                  min="0"
                  placeholder="0"
                  

                  value={ticket.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTicketChange(index, "price", e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`ticket-quantity-${index}`}>Quantity</Label>
                  <Input
                  id={`ticket-quantity-${index}`}
                  type="number"
                  min="1"
                  placeholder="100"
                  

                  value={ticket.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTicketChange(index, "quantity", e.target.value)}
                  />
                </div>
                </div>
              </div>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full" onClick={addTicketType}>
              Add Another Ticket Type
            </Button>
            </div>
        )
      case 3:
        return (
          <div className="space-y-4 flex flex-col w-full">
            <div className="grid gap-2">
              <Label htmlFor="cover-image">Cover Image</Label>
              {/* Responsive image upload area */}
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-4 min-h-[8rem]">
                <div className="flex flex-col items-center gap-1 text-center">
                  {!coverImagePreview && (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Drag & drop or click to upload</p>
                    </>
                  )}
                  <Input id="cover-image" type="file" className="hidden" accept="image/*" onChange={handleCoverImageChange} />
                  <Button variant="secondary" size="sm" onClick={() => document.getElementById("cover-image")?.click()} className="mt-2">
                    Select Image
                  </Button>
                  {coverImagePreview && (
                    <div className="mt-2 max-w-xs w-full overflow-hidden rounded">
                      <img src={coverImagePreview} alt="Cover Preview" className="w-full object-cover rounded shadow" />
                      <Button variant="destructive" size="sm" className="mt-1 w-full" onClick={handleRemoveCoverImage}>
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      case 4:
        return (
          <div className="space-y-6 flex flex-col w-full">
            <div className="bg-accent/30 p-4 rounded-lg border">
              <h3 className="text-lg font-medium mb-2">Review Your Event</h3>
              <p className="text-sm text-muted-foreground mb-4">Please review all the information before submitting your event.</p>
            </div>
            
            {/* Basic Info */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-primary mb-2 flex items-center"><Check className="w-4 h-4 mr-2" /> Basic Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Event Title</p>
                  <p className="text-sm text-muted-foreground">{formData.title || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Category</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.category === "other" ? formData.customCategory : formData.category}
                  </p>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground">{formData.description || "Not provided"}</p>
                </div>
              </div>
            </div>

            {/* Location & Time */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-primary mb-2 flex items-center"><MapPin className="w-4 h-4 mr-2" /> Location & Time</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{formData.location || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{formData.address || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Start Time</p>
                  <p className="text-sm text-muted-foreground">{formData.start_time || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">End Time</p>
                  <p className="text-sm text-muted-foreground">{formData.end_time || "Not provided"}</p>
                </div>
              </div>
            </div>

            {/* Tickets */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-primary mb-2 flex items-center"><Ticket className="w-4 h-4 mr-2" /> Tickets</h4>
              <div className="space-y-4">
                {formData.ticketTypes.map((ticket, index) => (
                  <div key={index} className="bg-background p-3 rounded border">
                    <p className="text-sm font-medium">{ticket.name || `Ticket Type #${index + 1}`}</p>
                    <div className="flex flex-wrap justify-between mt-1">
                      <p className="text-sm text-muted-foreground mr-4">Price: ${ticket.price || "0"}</p>
                      <p className="text-sm text-muted-foreground">Quantity: {ticket.quantity || "0"}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cover Image */}
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold text-primary mb-2 flex items-center"><ImageIcon className="w-4 h-4 mr-2" /> Cover Image</h4>
              {coverImagePreview ? (
                <div className="mt-2">
                  <img 
                    src={coverImagePreview} 
                    alt="Cover Preview" 
                    className="max-w-full w-auto h-auto object-cover rounded shadow" 
                  />
                </div>
              ) : (
                <p className="text-sm text-destructive">No cover image provided</p>
              )}
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 overflow-hidden py-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">Create New Event</h1>
            <p className="text-muted-foreground">Fill in the details below to create your event</p>
          </div>

          <div className="mb-8 overflow-x-auto">
            <div className="relative flex justify-between w-full min-w-[320px]">
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-1 flex-col items-center">
                  <div
                    className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 z-[999] ${
                      index <= currentStep
                        ? "border-black  bg-primary text-primary-foreground"
                        : "border-gray-300 bg-slate-100"
                    }`}
                  >
                    <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="mt-2 text-center text-xs sm:text-sm font-medium">{step.title}</div>
                  {index < steps.length - 1 && (
                    <div
                      className={`absolute left-0 top-4 sm:top-5 h-[2px] w-full -translate-x-1/2 translate-y-0 ${
                        index < currentStep ? " bg-primary" : "bg-gray-300"
                      }`}
                      style={{
                        left: `${((index + 1) / (steps.length - 1)) * 100}%`,
                        width: `${120 / (steps.length - 1)}%`,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep].title}</CardTitle>
              <CardDescription className="text-muted-foreground">
                {currentStep === 0 && "Provide basic information about your event"}
                {currentStep === 1 && "When and where will your event take place?"}
                {currentStep === 2 && "Set up ticket types and pricing"}
                {currentStep === 3 && "Upload images for your event"}
                {currentStep === 4 && "Review your event"}
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">{renderStepContent()}</CardContent>
            <CardFooter className="flex flex-wrap gap-3 justify-between">
              <Button variant="outline" onClick={prevStep} disabled={currentStep === 0} className="cursor-pointer">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    {currentStep === steps.length - 1
                      ? (isEditMode ? "Updating..." : "Creating...")
                      : "Next"}
                  </>
                ) : (
                  <>
                    {currentStep === steps.length - 1
                      ? (isEditMode ? "Update Event" : "Create Event")
                      : "Next"}
                    {currentStep < steps.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}
