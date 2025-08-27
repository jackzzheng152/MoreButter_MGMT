"use client"
// import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
// import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useEffect } from "react"
// import { cn } from "@/lib/utils"
import type { PayPeriod, StoreLocation } from "../types/payroll-types"
import { Input } from "@/components/ui/input";

interface AddPayPeriodDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (payPeriod: PayPeriod) => void
  locations: StoreLocation[]
  defaultLocation: string
}

const formSchema = z.object({
  startDate: z.string({
    required_error: "Start date is required",
  }).min(1, "Start date is required"),
  endDate: z.string({
    required_error: "End date is required",
  }).min(1, "End date is required"),
  location: z.string().min(1, { message: "Location is required" }),
})

export function AddPayPeriodDialog({ open, onOpenChange, onAdd, locations, defaultLocation }: AddPayPeriodDialogProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  })

  useEffect(() => {
    if (open) {
      form.reset({
        location: defaultLocation,
        startDate: "",
        endDate: "",
      })
    }
  }, [open, defaultLocation])

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Find the selected location to get its locationId
    const selectedLocation = locations.find(loc => loc.id === values.location);
    
    const newPayPeriod: PayPeriod = {
      id: `pp-${values.location}-${values.startDate}`,
      startDate: values.startDate,
      endDate: values.endDate,
      status: "pending",
      location: values.location,
      locationId: selectedLocation?.locationId || "" // Add the numeric location ID
    }

    onAdd(newPayPeriod)
    onOpenChange(false)
    form.reset()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] overflow-visible">
        <DialogHeader>
          <DialogTitle>Add New Pay Period</DialogTitle>
          <DialogDescription>Create a new pay period for processing payroll.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      console.log("Location value changed to:", value)
                      if (value !== "") {
                        field.onChange(value)
                      }
                    }}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {field.value
                            ? locations.find((loc) => loc.id === field.value)?.name
                            : "Select location"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper">
                      {locations.map((location) => (
                        <SelectItem
                          key={location.name}
                          value={location.id}
                          className="hover:bg-gray-100 m-0"
                        >
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Create Pay Period</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}