import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { EmployeeCreate, JobTitle, Location } from "../types/employee";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface AddTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEmployeeAdded: () => void;
  jobTitles: JobTitle[];
  locations: Location[];
}

export function AddTeamMemberDialog({
  open,
  onOpenChange,
  onEmployeeAdded,
  jobTitles,
  locations,
}: AddTeamMemberDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<EmployeeCreate>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    current_compensation: undefined,
    location_id: undefined,
    current_title_id: undefined,
    department_id: 1,
    current_level_id: 1,
    status: "Active",
  });

  const hasJobTitles = jobTitles?.length > 0;
  const hasLocations = locations?.length > 0;

  const handleInputChange = <K extends keyof EmployeeCreate>(field: K, value: EmployeeCreate[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Reset only when dialog transitions from closed -> open
  const wasOpen = useRef(false);
  useEffect(() => {
    if (open && !wasOpen.current) {
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        current_compensation: undefined,
        location_id: undefined,
        current_title_id: undefined,
        department_id: 1,
        current_level_id: 1,
        status: "Active",
      });
    }
    wasOpen.current = open;
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name || !formData.last_name || !formData.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (First Name, Last Name, Email)",
        variant: "destructive",
      });
      return;
    }
    if (formData.location_id == null || formData.current_title_id == null) {
      toast({
        title: "Validation Error",
        description: "Please select a location and job title",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await axios.post(`${API_BASE_URL}/employees/`, formData);
      toast({
        title: "Success!",
        description: `Employee ${formData.first_name} ${formData.last_name} created successfully`,
      });
      onEmployeeAdded();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "Failed to create employee";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Add New Team Member</DialogTitle>
          <DialogDescription>
            Fill in the details to add a new team member to your organization.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.preventDefault();
          }}
          className="space-y-4"
        >
          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleInputChange("first_name", e.target.value)}
                placeholder="Enter first name"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleInputChange("last_name", e.target.value)}
                placeholder="Enter last name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="Enter email address"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ""}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          {/* Job Information */}
          <div className="grid grid-cols-2 gap-4">
            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select
                value={formData.location_id !== undefined ? String(formData.location_id) : undefined}
                onValueChange={(value) => {
                  if (!value) return; // ignore empty string during re-renders
                  handleInputChange("location_id", Number(value));
                }}
                disabled={!hasLocations}
              >
                <SelectTrigger id="location">
                  <SelectValue placeholder={hasLocations ? "Select location" : "Loading locations..."}>
                    {locations.find(location => location.location_id === formData.location_id)?.location_name || "Select location"}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  {locations.map((location) => (
                    <SelectItem key={location.location_id} value={String(location.location_id)}>
                      {location.location_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.location_id != null && (
                <div className="text-xs text-green-600">
                  Selected: {locations.find((l) => l.location_id === formData.location_id)?.location_name}
                </div>
              )}
            </div>

            {/* Job Title */}
            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title *</Label>
              <Select
                value={formData.current_title_id !== undefined ? String(formData.current_title_id) : undefined}
                onValueChange={(value) => {
                  if (!value) return;
                  handleInputChange("current_title_id", Number(value));
                }}
                disabled={!hasJobTitles}
              >
                <SelectTrigger id="job_title">
                  <SelectValue placeholder={hasJobTitles ? "Select job title" : "Loading job titles..." }>
                    {jobTitles.find(title => title.title_id === formData.current_title_id)?.title_name || "Select job title"}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  {jobTitles.map((title) => (
                    <SelectItem key={title.title_id} value={String(title.title_id)}>
                      {title.title_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.current_title_id != null && (
                <div className="text-xs text-green-600">
                  Selected: {jobTitles.find((t) => t.title_id === formData.current_title_id)?.title_name}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="compensation">Hourly Rate</Label>
              <Input
                id="compensation"
                type="number"
                step="0.01"
                min="0"
                value={formData.current_compensation ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  handleInputChange("current_compensation", v === "" ? undefined : Number(v));
                }}
                placeholder="Enter hourly rate"
              />
            </div>
            {/* Status */}
            <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                    value={formData.status ?? "Active"} // keep controlled; default to Active
                    onValueChange={(value) =>
                    handleInputChange("status", value as EmployeeCreate["status"])
                    }
                >
                    <SelectTrigger id="status">
                        <SelectValue placeholder="Select status">
                            {formData.status || "Select status"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent position="popper">
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Part-Time">Part-Time</SelectItem>
                        <SelectItem value="Full-Time">Full-Time</SelectItem>
                        <SelectItem value="On Leave">On Leave</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                </Select>
                {formData.status && (
                    <div className="text-xs text-green-600">Selected: {formData.status}</div>
                )}
            </div>
        </div>

          {/* Debug info (optional) */}
          {(!hasJobTitles || !hasLocations) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <strong>Debug Info:</strong>
              <br />
              Job Titles: {jobTitles?.length || 0} items
              <br />
              Locations: {locations?.length || 0} items
              <br />
              {!hasJobTitles && "Job titles data is missing or empty"}
              <br />
              {!hasLocations && "Locations data is missing or empty"}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !hasJobTitles || !hasLocations}>
              {isSubmitting ? "Creating..." : "Create Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
