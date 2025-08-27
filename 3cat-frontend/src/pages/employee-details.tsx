import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Mail,
  Phone,
  Calendar,
  Briefcase,
  MapPin,
  User,
  Edit,
  Plus,
  X,
  Save,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTeamData } from "@/features/team/hooks/useTeamData";
import { useUpdateEmployee } from "@/features/team/hooks/useUpdateEmployee";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useEmployeeCompensationLogs } from "@/features/employee update/hooks/useCompensation";
import { safeToFixed } from "@/lib/utils";
import { parseISO, format } from 'date-fns';

interface Employee {
  id: string;
  name: string;
  avatar: string;
  initials: string;
  title: string;
  status: "Active" | "Inactive" | "On Leave" | "Part-Time" | "Full-Time" | "Terminated";
  email: string;
  phone: string;
  location: string;
  startDate: string;
  jobTitle: string;
  reportsTo: string;
  skills: string[];
  systemIds: {
    bambooHrId: string;
    sevenShiftId: string;
    gustoId: string | null;
    punchId: string;
  };
  createdAt: string;
}

// Zod schema for validation
const EmployeeUpdateSchema = z.object({
  gusto_id: z.string().nullable().optional(),
  sevenshift_id: z.string().nullable().optional(),
  punch_id: z.string().nullable().optional(),
  status: z.enum(["Active", "On Leave", "Inactive", "Part-Time", "Full-Time", "Terminated"]).optional(),
});

export function EmployeeDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { employees, isLoading, isError, error, jobTitles, locations } = useTeamData();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedValues, setEditedValues] = useState({
    name: "",
    email: "",
    phone: "",
    jobTitle: "",
    location: "",
    status: "",
    bamboohrId: "",
    sevenShiftId: "",
    gustoId: "",
    punchId: "",
  });

  const { mutate: updateEmployeeMutation } = useUpdateEmployee();

  const getJobTitleName = React.useCallback(
    (titleId: number | string) => {
      const parsedId = typeof titleId === 'string' ? parseInt(titleId) : titleId;
      const title = jobTitles.find(t => t.title_id === parsedId);
      return title ? title.title_name : "Unknown";
    },
    [jobTitles]
  );

  const getLocationName = React.useCallback(
    (locationId: number | string) => {
      const parsedId = typeof locationId === 'string' ? parseInt(locationId) : locationId;
      const location = locations.find(l => l.location_id === parsedId);
      return location ? location.location_name : "Unknown";
    },
    [locations]
  );

  const employee: Employee | undefined = React.useMemo(() => {
    const foundEmployee = employees.find((emp) => emp.id.toString() === id);

    if (!foundEmployee) return undefined;

    // Map EmployeeWithUIFields to the local Employee interface
    return {
      id: foundEmployee.id.toString(),
      name: foundEmployee.name,
      avatar: foundEmployee.avatar || "https://github.com/shadcn.png", // Default avatar if not available
      initials: foundEmployee.initials,
      title: getJobTitleName(foundEmployee.current_title_id || 0), // Use current job title
      status: foundEmployee.status as Employee["status"], // Type assertion for status
      email: foundEmployee.email,
      phone: foundEmployee.phone || "",
      location: getLocationName(foundEmployee.location_id || 0), // Use getLocationName
      startDate: foundEmployee.created_at ? new Date(foundEmployee.created_at).toLocaleDateString() : "N/A",
      jobTitle: getJobTitleName(foundEmployee.current_title_id || 0), // Default to current job title for now
      reportsTo: "N/A", // Assuming this data is not in EmployeeWithUIFields, or needs to be fetched separately
      skills: [], // Assuming skills are not in EmployeeWithUIFields, or needs to be fetched separately
      systemIds: {
        bambooHrId: foundEmployee.bamboo_hr_id || "N/A",
        sevenShiftId: foundEmployee.sevenshift_id || "N/A",
        gustoId: foundEmployee.gusto_id,
        punchId: foundEmployee.punch_id || "N/A",
      },
      createdAt: foundEmployee.created_at ? new Date(foundEmployee.created_at).toLocaleString() : "N/A",
    };
  }, [id, employees, getJobTitleName, getLocationName]);

  // Fetch compensation logs for this employee
  const { data: compensationLogs = [] } = useEmployeeCompensationLogs(employee?.id || null);

  // Create employment history from compensation logs
  const employmentHistory = React.useMemo(() => {
    if (!compensationLogs || compensationLogs.length === 0) {
      return [];
    }

    // Sort compensation logs by effective_date (newest first for display)
    const sortedLogs = [...compensationLogs].sort((a: any, b: any) => {
      const dateA = a.effective_date ? new Date(a.effective_date).getTime() : 0;
      const dateB = b.effective_date ? new Date(b.effective_date).getTime() : 0;
      return dateB - dateA; // Newest first for display
    });

    const history = [];
    // For each log, use its effective_date as start, and the previous log's effective_date as end
    for (let i = 0; i < sortedLogs.length; i++) {
      const currentLog = sortedLogs[i];
      const prevLog = sortedLogs[i - 1];
      const jobTitle = currentLog.new_title_id ? getJobTitleName(currentLog.new_title_id) : 
                      currentLog.title_id ? getJobTitleName(currentLog.title_id) : 'N/A';
      const location = currentLog.location_id ? getLocationName(currentLog.location_id) : 'N/A';
      const startDate = currentLog.effective_date
        ? format(parseISO(currentLog.effective_date), 'MM/dd/yyyy')
        : 'N/A';
      let endDate = 'Present';
      if (i > 0 && prevLog && prevLog.effective_date) {
        endDate = format(parseISO(prevLog.effective_date), 'MM/dd/yyyy');
      }
      const period = startDate !== 'N/A' ? `${startDate} - ${endDate}` : 'N/A';
      const compensation = currentLog.rate_amount != null ? currentLog.rate_amount : 0;
      history.push({
        id: `eh-${currentLog.id}`,
        jobTitle,
        type: i === 0 ? "current" as const : "past" as const,
        location,
        period,
        compensation: {
          amount: compensation,
          unit: "hr" as const,
        },
        description: currentLog.change_reason || "Employment period",
        effectiveDate: currentLog.effective_date,
      });
    }
    return history;
  }, [compensationLogs, getJobTitleName, getLocationName]);

  // Function to handle opening edit dialog
  const handleEditEmployee = () => {
    if (!employee) return;

    setEditedValues({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || "",
      jobTitle: employee.jobTitle,
      location: employee.location,
      status: employee.status,
      bamboohrId: employee.systemIds.bambooHrId,
      sevenShiftId: employee.systemIds.sevenShiftId,
      gustoId: employee.systemIds.gustoId || "",
      punchId: employee.systemIds.punchId,
    });

    setIsEditDialogOpen(true);
  };

  // Function to save employee changes
  const handleSaveEmployee = () => {
    if (!employee) return;

    try {
      const updatePayload = EmployeeUpdateSchema.parse({
        gusto_id: editedValues.gustoId === "" ? null : editedValues.gustoId,
        sevenshift_id: editedValues.sevenShiftId === "" ? null : editedValues.sevenShiftId,
        punch_id: editedValues.punchId === "" ? null : editedValues.punchId,
        status: editedValues.status || undefined,
      });

      updateEmployeeMutation(
        {
          employee_id: Number(employee.id),
          data: updatePayload,
        },
        {
          onSuccess: () => {
            setIsEditDialogOpen(false);
            // You might want to add a toast notification here
          },
          onError: (error: Error) => {
            console.error("Failed to update employee:", error.message);
            // You might want to add an error toast notification here
          },
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Validation error:", error.errors);
        // You might want to add a validation error toast notification here
      }
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading employee details...</div>;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load employee details: {error?.message}</AlertDescription>
      </Alert>
    );
  }

  if (!employee) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not Found</AlertTitle>
        <AlertDescription>Employee with ID "{id}" not found.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/team')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-arrow-left"
            >
              <path d="m12 19-7-7 7-7" />
              <path d="M19 12H5" />
            </svg>
          </Button>
          <h1 className="text-3xl font-bold">Employee Details</h1>
        </div>
        <Button onClick={handleEditEmployee}>
          <Edit className="mr-2 h-4 w-4" />
          Edit Employee
        </Button>
      </div>

      {/* Missing Critical Information Alert */}
      {!employee.systemIds.gustoId && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 flex flex-col items-center">
          <div className="flex items-center justify-center items-center gap-2 mb-1 w-full">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <AlertTitle className="text-black text-xl font-bold text-center">Missing Critical Information</AlertTitle>
          </div>
          <AlertDescription className="text-gray-700 mb-1 text-center w-full">
            The following information needs to be added to complete this employee's profile:
          </AlertDescription>
          <ul className="list-disc list-inside ml-7 mt-0 text-red-700">
            <li className="flex items-center">
              <AlertCircle className="h-4 w-4 mr-1 text-red-400" />
              Gusto ID Missing: Employee cannot be processed in payroll system
            </li>
          </ul>
        </Alert>
      )}

      {/* Main Content Area (Two Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Employee Profile Card */}
        <Card className="md:col-span-1 h-fit text-left">
          <CardHeader>
            <div className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={employee.avatar} alt={employee.name} />
                <AvatarFallback className="text-4xl">{employee.initials}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-xl">{employee.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{employee.title}</p>
              <Badge
                className={`mt-2 rounded-full ${
                  employee.status === "Terminated" || employee.status === "Inactive"
                    ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-50 border-yellow-200"
                    : "bg-green-100 text-green-700 hover:bg-green-100"
                }`}
                variant="outline"
              >
                {employee.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{employee.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{employee.phone || "(N/A)"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{employee.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Started {employee.startDate}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>Job Title: {employee.jobTitle || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Reports To: {employee.reportsTo || "N/A"}</span>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h3 className="font-medium">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {employee.skills.length > 0 ? (
                  employee.skills.map((skill, index) => (
                    <Badge key={index} variant="outline">
                      {skill}
                    </Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No skills listed</span>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <h3 className="font-medium">System IDs</h3>
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="text-left">BambooHR ID:</div>
                <div className="font-mono text-left">{employee.systemIds.bambooHrId}</div>
                <div className="text-left">7shift ID:</div>
                <div className="font-mono text-left">{employee.systemIds.sevenShiftId}</div>
                <div className="text-left">Gusto ID:</div>
                <div className={`font-mono text-left ${!employee.systemIds.gustoId ? "text-red-500" : ""}`}>
                  {employee.systemIds.gustoId || "Missing"}
                </div>
                <div className="text-left">Punch ID:</div>
                <div className="font-mono text-left">{employee.systemIds.punchId}</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Profile created on {employee.createdAt}
            </p>
          </CardContent>
        </Card>

        {/* Right Column: Tabs */}
        <div className="md:col-span-2">
          <Tabs defaultValue="employment-pay-history">
            <TabsList className="grid w-full grid-cols-4 h-10">
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="employment-pay-history">Employment & Pay History</TabsTrigger>
              <TabsTrigger value="training-quizzes">Training & Quizzes</TabsTrigger>
            </TabsList>

            <TabsContent value="schedule" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Schedule information would go here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Document management features would go here.</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="employment-pay-history" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button onClick={() => console.log("Add Employment & Pay Record")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Employment & Pay Record
                </Button>
              </div>
              <div className="space-y-4">
                {/* Employment History Section */}
                {Array.isArray(employmentHistory) && employmentHistory.length > 0 && (
                  <div className="space-y-3">
                    {employmentHistory.map((record: any) => {
                      return (
                        <Card key={record.id}>
                          <CardContent className="p-4 flex justify-between items-start flex-col h-full">
                            <div className="flex items-start justify-between w-full">
                              <div className="flex items-start gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground mt-1" />
                                <div>
                                  <div className="font-medium flex items-center gap-2 pb-2">
                                    {record.jobTitle}
                                    {record.type === "current" && (
                                      <Badge variant="outline" className="bg-green-100 text-green-700 rounded-full">
                                        Current
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2 pb-1">
                                      <MapPin className="h-4 w-4 text-muted-foreground" />
                                      <span>{record.location}</span>
                                    </div>
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-muted-foreground" />
                                      <span>{record.period}</span>
                                    </div>
                                  </p>
                                  {record.description && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                      {record.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end">
                                <div className="font-medium text-right">
                                  ${safeToFixed(record.compensation.amount)}/{record.compensation.unit}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Hourly compensation
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="training-quizzes" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Training & Quizzes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">Training and quiz records would go here.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Employee Details</DialogTitle>
            <DialogDescription>
              Make changes to the employee information. Click save when you're done.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={employee?.avatar} alt={employee?.name} />
                <AvatarFallback>{employee?.initials}</AvatarFallback>
              </Avatar>
              <div className="grid gap-1.5">
                <div className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 flex items-center">
                  {editedValues.name}
                </div>    
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <div className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 flex items-center">
                  {editedValues.email}
                </div>    
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <div className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 flex items-center">
                  {editedValues.phone}
                </div>    
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="jobTitle">Job Title</Label>
                <div className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 flex items-center">
                  {editedValues.jobTitle}
                </div>    
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="location">Store Location</Label>
                <div className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 flex items-center">
                  {editedValues.location}
                </div>    
              </div>
            </div>
            
            <div className="grid gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editedValues.status}
                onValueChange={(value) => setEditedValues({ ...editedValues, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status">
                    {editedValues.status}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Part-Time">Part-Time</SelectItem>
                  <SelectItem value="Full-Time">Full-Time</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
              {editedValues.status === "Inactive" && (
                <p className="text-xs text-amber-600 mt-1">
                  Setting an employee to Inactive will create tasks to remove them from all connected platforms.
                </p>
              )}
            </div>
            
            <Separator className="my-2" />
            <h3 className="text-sm font-medium">System IDs</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="bamboohrId">BambooHR ID</Label>
                <div className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 flex items-center">
                  {editedValues.bamboohrId}
                </div>    
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sevenShiftId">7shift ID</Label>
                <Input
                  id="sevenShiftId"
                  value={editedValues.sevenShiftId}
                  onChange={(e) => setEditedValues({ ...editedValues, sevenShiftId: e.target.value })}
                  placeholder="7shift ID"
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 flex items-center"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="gustoId" className={!editedValues.gustoId ? "text-red-500" : ""}>
                    Gusto ID {!editedValues.gustoId && <span className="text-xs">(Required)</span>}
                  </Label>
                  {!editedValues.gustoId && <span className="text-xs text-red-500">Missing - Will create task</span>}
                </div>
                <Input
                  id="gustoId"
                  value={editedValues.gustoId}
                  onChange={(e) => setEditedValues({ ...editedValues, gustoId: e.target.value })}
                  placeholder="GUS-XXXX"
                  className={!editedValues.gustoId ? "border-red-300 focus-visible:ring-red-500" : ""}
                />
                {!editedValues.gustoId && (
                  <p className="text-xs text-red-500">A task will be created to add this employee to Gusto payroll.</p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="punchId">Punch ID</Label>
                <Input
                  id="punchId"
                  value={editedValues.punchId}
                  onChange={(e) => setEditedValues({ ...editedValues, punchId: e.target.value })}
                  placeholder="PUNCH-XXXX"
                  className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-700 flex items-center"
                />
              </div>
            </div>
            
            {employee?.createdAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Employee profile created on {employee.createdAt}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSaveEmployee}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmployeeDetailsPage;
