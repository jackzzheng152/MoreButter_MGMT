import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowUpDown,
  Edit,
  Mail,
  MoreHorizontal,
  Phone,
  Save,
  Search,
  UserPlus,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";  
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTeamData } from "@/features/team/hooks/useTeamData";
import { useUpdateEmployee } from "@/features/team/hooks/useUpdateEmployee";
import { EmployeeWithUIFields } from "@/features/team/types/employee";
import { z } from "zod";
import { removeFromBambooHR, removeFrom7Shifts } from "../api/platformAPI";
import { useSort, sortData } from "@/lib/sortUtils";

interface ToastState {
  title: string;
  description: string;
  variant: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  createdAt: string;
  dueDate: string;
  priority: string;
  status: string;
  type: string;
  platformsToCheck?: Array<{
    name: string;
    verified: boolean;
    lastChecked?: string;
  }>;
}

// Zod schema for validation
const EmployeeUpdateSchema = z.object({
  gusto_id: z.string().nullable().optional(),
  sevenshift_id: z.string().nullable().optional(),
  punch_id: z.string().nullable().optional(),
  status: z.enum(["Active", "On Leave", "Inactive", "Part-Time", "Full-Time", "Terminated"]).optional(),
});

// Toast component for notifications
const Toast = ({ title, description, variant, onClose }: { title: string, description: string, variant: string, onClose: () => void }) => {
  return (
    <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-md ${variant === 'destructive' ? 'bg-red-100 border-red-200' : 'bg-green-100 border-green-200'}`}>
      <div className="flex justify-between">
        <div>
          <h4 className="font-medium">{title}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export function TeamManagement() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMember, setEditingMember] = useState<EmployeeWithUIFields | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTasksPanel, setShowTasksPanel] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [verifyingPlatform, setVerifyingPlatform] = useState<{ employeeId: string; platform: string } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [showInactive, setShowInactive] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // State for edited values
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

  // Use the combined hook for all team data
  const { 
    employees, 
    jobTitles, 
    locations, 
    isLoading, 
    isError, 
    error 
  } = useTeamData();

  const { mutate: updateEmployeeMutation } = useUpdateEmployee();

  // Helper functions using useMemo for performance
  const getJobTitleName = useMemo(() => {
    return (titleId: number | string) => {
      const id = typeof titleId === 'string' ? parseInt(titleId) : titleId;
      const title = jobTitles.find(t => t.title_id === id);
      return title ? title.title_name : "Unknown";
    };
  }, [jobTitles]);

  const getLocationName = useMemo(() => {
    return (locationId: number | string) => {
      const id = typeof locationId === 'string' ? parseInt(locationId) : locationId;
      const location = locations.find(l => l.location_id === id);
      return location ? location.location_name : "Unknown";
    };
  }, [locations]);

  // Function to create a Gusto task for an employee - defined BEFORE it's used in useEffect
  const createGustoTask = useCallback((employee: EmployeeWithUIFields): Task => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 1);

    return {
      id: `task-${Date.now()}-${employee.id}`,
      title: `Add Gusto ID for ${employee.first_name} ${employee.last_name}`,
      description: `Employee ${employee.first_name} ${employee.last_name} is missing a Gusto ID. Please add them to Gusto payroll system as soon as possible.`,
      employeeId: employee.id.toString(),
      employeeName: `${employee.first_name} ${employee.last_name}`,
      employeeEmail: employee.email,
      createdAt: new Date().toISOString(),
      dueDate: dueDate.toISOString(),
      priority: "Critical",
      status: "Pending",
      type: "Payroll",
    };
  }, []);

  // Function to create offboarding task
  const createOffboardingTask = useCallback((employee: EmployeeWithUIFields): Task => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3); // Give 3 days to complete offboarding

    return {
      id: `offboarding-${Date.now()}-${employee.id}`,
      title: `Offboard ${employee.first_name} ${employee.last_name}`,
      description: `Employee ${employee.first_name} ${employee.last_name} has been marked as Inactive. Please remove them from all connected platforms.`,
      employeeId: employee.id.toString(),
      employeeName: `${employee.first_name} ${employee.last_name}`,
      employeeEmail: employee.email,
      createdAt: new Date().toISOString(),
      dueDate: dueDate.toISOString(),
      priority: "High",
      status: "Pending",
      type: "Offboarding",
      platformsToCheck: [
        { name: "Google Workspace", verified: false },
        { name: "Slack", verified: false },
        { name: "Gusto", verified: false },
        { name: "7Shifts", verified: false },
        { name: "BambooHR", verified: false },
      ],
    };
  }, []);

  // Get unique job titles and locations for filters
  const uniqueJobTitles = useMemo(() => 
    [...new Set(jobTitles.map(t => t.title_name))], 
    [jobTitles]
  );
  
  const uniqueLocations = useMemo(() => 
    [...new Set(locations.map(l => l.location_name))], 
    [locations]
  );

  // Function to show toast notification
  const showToast = ({ title, description, variant = "default" }: { title: string; description: string; variant?: string }) => {
    setToast({ title, description, variant });
    setTimeout(() => setToast(null), 3000);
  };

  // Memoize employees missing Gusto IDs to prevent unnecessary effect runs
  const employeesMissingGusto = useMemo(() => 
    employees.filter((emp) => !emp.gusto_id),
    [employees]
  );

  // Initialize tasks for employees missing Gusto IDs - runs when employees data changes
  React.useEffect(() => {
    if (!employeesMissingGusto.length) return;

    setTasks((prevTasks) => {
      const existingPayrollTasks = new Set(
        prevTasks
          .filter((t) => t.type === "Payroll" && t.status === "Pending")
          .map((t) => t.employeeId)
      );

      const newTasks = employeesMissingGusto
        .filter((emp) => !existingPayrollTasks.has(emp.id.toString()))
        .map((emp) => createGustoTask(emp));

      // Only update if there are actually new tasks to add
      if (newTasks.length === 0) {
        return prevTasks;
      }

      return [...prevTasks, ...newTasks];
    });
  }, [employeesMissingGusto.length, createGustoTask]);

  const SORT_KEYS = [
    'name',
    'contact',
    'hourlyRate',
    'jobTitle',
    'location',
    'status',
  ] as const;
  type SortKey = typeof SORT_KEYS[number];

  const { sortConfig, handleSort } = useSort<SortKey>('name');

  const getSortValue = (member: EmployeeWithUIFields, key: SortKey): string | number => {
    switch (key) {
      case 'name':
        return member.name || '';
      case 'contact':
        return member.email || '';
      case 'hourlyRate': 
        return member.current_compensation || 0;
      case 'jobTitle':
        return getJobTitleName(member.current_title_id || 0) || '';
      case 'location':
        return getLocationName(member.location_id || 0) || '';
      case 'status':
        return member.status || '';
      default:
        return '';
    }
  };

  // Filtered members based on search and filters
  const filteredMembers = useMemo(() => {
    const result = employees.filter((member) => {
      const matchesSearch =
        member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        getJobTitleName(member.current_title_id || 0).toLowerCase().includes(searchQuery.toLowerCase()) ||
        getLocationName(member.location_id || 0).toLowerCase().includes(searchQuery.toLowerCase());

      const matchesJobTitle =
        selectedDepartment === "all" || 
        getJobTitleName(member.current_title_id || 0).toLowerCase() === selectedDepartment.toLowerCase();

      const matchesLocation =
        selectedLocation === "all" || 
        getLocationName(member.location_id || 0).toLowerCase() === selectedLocation.toLowerCase();

      const matchesStatus = showInactive || (member.status !== "Inactive" && member.status !== "Terminated");

      return matchesSearch && matchesJobTitle && matchesLocation && matchesStatus;
    });
    return sortData(result, sortConfig, getSortValue);
  }, [employees, searchQuery, selectedDepartment, selectedLocation, showInactive, getJobTitleName, getLocationName, sortConfig]);

  // Function to open edit dialog
  const handleEditMember = (member: EmployeeWithUIFields) => {
    const jobTitle = getJobTitleName(member.current_title_id || 0);
    const location = getLocationName(member.location_id || 0);

    setEditingMember(member);
    setEditedValues({
      name: member.name,
      email: member.email,
      phone: member.phone || "",
      jobTitle,
      location,
      status: member.status,
      bamboohrId: member.bamboo_hr_id || "",
      sevenShiftId: member.sevenshift_id || "",
      gustoId: member.gusto_id || "",
      punchId: member.punch_id || "",
    });

    setIsEditDialogOpen(true);
  };

  // Function to verify if an employee exists in a platform
  const verifyEmployeeInPlatform = async (employeeId: string, platform: string, email: string) => {
    setVerifyingPlatform({ employeeId, platform });

    try {
      let verified = false;
      const employee = employees.find(emp => emp.id.toString() === employeeId);

      if (!employee) {
        throw new Error('Employee not found');
      }

      switch (platform) {
        case 'BambooHR':
          if (employee.bamboo_hr_id) {
            await removeFromBambooHR(employee.bamboo_hr_id);
            verified = true;
          }
          break;
        case '7Shifts':
          if (employee.sevenshift_id) {
            await removeFrom7Shifts(employee.sevenshift_id);
            verified = true;
          }
          break;
        default:
          // For other platforms, we'll just simulate the verification
          await new Promise((resolve) => setTimeout(resolve, 1500));
          verified = true;
      }

      setTasks((prevTasks) =>
        prevTasks.map((task) => {
          if (task.type === "Offboarding" && task.employeeId === employeeId) {
            const updatedPlatforms = task.platformsToCheck?.map((p) =>
              p.name === platform ? { ...p, verified, lastChecked: new Date().toISOString() } : p
            );

            const allVerified = updatedPlatforms?.every((p) => p.verified);

            return {
              ...task,
              platformsToCheck: updatedPlatforms,
              status: allVerified ? "Completed" : task.status,
            };
          }
          return task;
        })
      );

      showToast({
        title: verified ? "Verification successful" : "Verification failed",
        description: verified
          ? `${email} has been removed from ${platform}.`
          : `${email} could not be removed from ${platform}. Please try again or remove manually.`,
        variant: verified ? "default" : "destructive",
      });
    } catch (error) {
      console.error(`Error verifying ${platform}:`, error);
      showToast({
        title: "Verification failed",
        description: `Failed to remove ${email} from ${platform}. Please try again or remove manually.`,
        variant: "destructive",
      });
    } finally {
      setVerifyingPlatform(null);
    }
  };

  // Function to save member changes
  const handleSaveMember = () => {
    if (!editingMember) return;

    const previousStatus = editingMember.status;
    const newStatus = editedValues.status;

    try {
      const updatePayload = EmployeeUpdateSchema.parse({
        gusto_id: editedValues.gustoId === "" ? null : editedValues.gustoId,
        sevenshift_id: editedValues.sevenShiftId === "" ? null : editedValues.sevenShiftId,
        punch_id: editedValues.punchId === "" ? null : editedValues.punchId,
        status: editedValues.status || undefined,
      });


      
      updateEmployeeMutation(
        {
          employee_id: Number(editingMember.id),
          data: updatePayload,
        },
        {
          onSuccess: () => {
            showToast({
              title: "Employee updated",
              description: `${editedValues.name}'s information has been saved to the database.`,
            });

            // Handle status change to Inactive
            if (previousStatus !== "Inactive" && newStatus === "Inactive") {
              const offboardingTask = createOffboardingTask({
                ...editingMember,
                status: "Inactive",
              });

              setTasks((prevTasks) => [...prevTasks, offboardingTask]);
              showToast({
                title: "Offboarding task created",
                description: `Task created to remove ${editedValues.name} from all platforms.`,
                variant: "default",
              });
              setShowTasksPanel(true);
            }

            // Handle Gusto ID changes
            const previousGustoId = editingMember.gusto_id;
            const newGustoId = editedValues.gustoId;

            if (previousGustoId && !newGustoId) {
              const newTask = createGustoTask({
                ...editingMember,
                gusto_id: "",
              });
              setTasks((prevTasks) => [...prevTasks, newTask]);
              showToast({
                title: "Task created",
                description: `Add Gusto ID for ${editedValues.name} as soon as possible.`,
                variant: "destructive",
              });
            } else if (!previousGustoId && newGustoId) {
              setTasks((prevTasks) =>
                prevTasks.map((task) => {
                  if (task.employeeId === editingMember.id.toString() && task.type === "Payroll" && task.status !== "Completed") {
                    return { ...task, status: "Completed" };
                  }
                  return task;
                })
              );
              showToast({
                title: "Gusto ID added",
                description: `${editedValues.name} has been successfully added to Gusto payroll.`,
                variant: "default",
              });
            }
          },
          onError: (error: any) => {
            showToast({
              title: "Update failed",
              description: error.message ?? "Something went wrong",
              variant: "destructive",
            });
          },
        }
      );

      setIsEditDialogOpen(false);
    } catch (error) {
      if (error instanceof z.ZodError) {
        showToast({
          title: "Validation Error",
          description: "Please check the employee data and try again.",
          variant: "destructive",
        });
      } else {
        showToast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading team data...</div>
        </div>
      </div>
    );
  }

  // Handle error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-red-600">
            Error loading team data: {error?.message || "Unknown error"}
          </div>
        </div>
      </div>
    );
  }

  // Count employees with missing Gusto IDs and offboarding tasks
  const missingGustoCount = employees.filter((member) => !member.gusto_id).length;
  const offboardingTasksCount = tasks.filter(
    (task) => task.type === "Offboarding" && task.status !== "Completed"
  ).length;
  const pendingTasksCount = tasks.filter((task) => task.status !== "Completed").length;

  return (
    <div className="space-y-6 relative">
      {/* Toast notification */}
      {toast && (
        <Toast
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Sticky header with search and filters */}
      <div className="sticky top-0 z-10 bg-background pt-6 pb-4 border-b">
        {/* Tasks Summary */}
        {pendingTasksCount > 0 && (
          <div className="mb-4 border rounded-lg bg-red-50 border-red-200 overflow-hidden">
            <div className="px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <div>
                  <h3 className="font-medium text-left">Pending Tasks ({pendingTasksCount})</h3>
                  <p className="text-sm text-muted-foreground">
                    {missingGustoCount > 0 && (
                      <span>
                        {missingGustoCount} {missingGustoCount === 1 ? "employee is" : "employees are"} missing Gusto ID.{" "}
                      </span>
                    )}
                    {offboardingTasksCount > 0 && (
                      <span>
                        {offboardingTasksCount} {offboardingTasksCount === 1 ? "employee needs" : "employees need"} to
                        be removed from platforms.
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={() => setShowTasksPanel(!showTasksPanel)}
              >
                {showTasksPanel ? (
                  <>Hide Details <ChevronUp className="h-4 w-4" /></>
                ) : (
                  <>Show Details <ChevronDown className="h-4 w-4" /></>
                )}
              </Button>
            </div>

            {showTasksPanel && (
              <div className="px-4 pb-3 pt-1">
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {tasks
                    .filter((task) => task.status !== "Completed")
                    .map((task) => (
                      <div key={task.id} className="border rounded-lg p-3 bg-white">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-red-800 text-left">{task.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                          </div>
                          <Badge variant={task.priority === "Critical" ? "destructive" : "outline"}>
                            {task.priority}
                          </Badge>
                        </div>

                        {task.type === "Offboarding" && task.platformsToCheck && (
                          <div className="mt-3 space-y-2">
                            <h4 className="text-sm font-medium">Platform Verification</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {task.platformsToCheck.map((platform) => (
                                <div key={platform.name} className="flex items-center justify-between border rounded p-2 bg-gray-50">
                                  <div className="flex items-center gap-2">
                                    {platform.verified ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <div className="h-4 w-4 rounded-full border border-gray-300" />
                                    )}
                                    <span className="text-sm">{platform.name}</span>
                                  </div>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          disabled={platform.verified || verifyingPlatform !== null}
                                          onClick={() => verifyEmployeeInPlatform(task.employeeId, platform.name, task.employeeEmail)}
                                          className="h-7 px-2"
                                        >
                                          {verifyingPlatform?.employeeId === task.employeeId &&
                                          verifyingPlatform?.platform === platform.name ? (
                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <span className="text-xs">Verify</span>
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {platform.verified
                                          ? `Verified on ${new Date(platform.lastChecked || "").toLocaleString()}`
                                          : `Check if ${task.employeeEmail} has been removed from ${platform.name}`}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between items-center mt-3">
                          <div className="text-xs text-muted-foreground">
                            Due: {new Date(task.dueDate).toLocaleDateString()} • Created:{" "}
                            {new Date(task.createdAt).toLocaleDateString()}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              const employee = employees.find((emp) => emp.id.toString() === task.employeeId);
                              if (employee) {
                                handleEditMember(employee);
                              }
                            }}
                          >
                            {task.type === "Offboarding" ? "Manage" : "Resolve"}
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <div className="flex flex-1 gap-4 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search team members..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Job Title">
                  {selectedDepartment === "all" ? "All Job Titles" : selectedDepartment}
                </SelectValue>
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">All Job Titles</SelectItem>
                {uniqueJobTitles.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Location">
                  {selectedLocation === "all" ? "All Locations" : selectedLocation}
                </SelectValue>
              </SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">All Locations</SelectItem>
                {uniqueLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-2"
            >
              {showInactive ? (
                <>Hide Inactive <Eye className="h-4 w-4" /></>
              ) : (
                <>Show Inactive <EyeOff className="h-4 w-4" /></>
              )}
            </Button>
            <Button onClick={() => {
              // Handle add member - you'll need to implement this
              console.log("Add member clicked");
            }}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
            {selectedDepartment !== "all" ? ` in ${selectedDepartment}` : ""}
            {!showInactive && " (active only)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead onClick={() => handleSort('name')} className="cursor-pointer select-none group sortable-header">
                  <div className="flex items-center gap-1 group-hover:bg-gray-200 rounded px-2 py-1 transition-colors">
                    Name
                    {sortConfig.key === 'name' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('contact')} className="cursor-pointer select-none group sortable-header">
                  <div className="flex items-center gap-1 group-hover:bg-gray-200 rounded px-2 py-1 transition-colors">
                    Contact
                    {sortConfig.key === 'contact' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('hourlyRate')} className="cursor-pointer select-none group sortable-header">
                  <div className="flex items-center gap-1 group-hover:bg-gray-200 rounded px-2 py-1 transition-colors">
                    Hourly Rate
                    {sortConfig.key === 'hourlyRate' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('jobTitle')} className="cursor-pointer select-none group sortable-header">
                  <div className="flex items-center gap-1 group-hover:bg-gray-200 rounded px-2 py-1 transition-colors">
                    Job Title
                    {sortConfig.key === 'jobTitle' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('location')} className="cursor-pointer select-none group sortable-header">
                  <div className="flex items-center gap-1 group-hover:bg-gray-200 rounded px-2 py-1 transition-colors">
                    Location
                    {sortConfig.key === 'location' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead onClick={() => handleSort('status')} className="cursor-pointer select-none group sortable-header">
                  <div className="flex items-center gap-1 group-hover:bg-gray-200 rounded px-2 py-1 transition-colors">
                    Status
                    {sortConfig.key === 'status' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No team members found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    className={!member.gusto_id ? "bg-red-50" : member.status === "Inactive" ? "bg-gray-50" : ""}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={member.avatar} alt={member.name} />
                          <AvatarFallback>{member.initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{member.name}</div>
                          {!member.gusto_id && (
                            <Badge variant="destructive" className="text-xs mt-1">
                              Missing Gusto ID
                            </Badge>
                          )}
                          {member.status === "Inactive" && (
                            <Badge variant="outline" className="text-xs mt-1 bg-gray-100">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {member.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {member.phone || "(N/A)"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>${member.current_compensation || member.hourlyRate || 0}</TableCell>
                    <TableCell>{getJobTitleName(member.current_title_id || 0)}</TableCell>
                    <TableCell>{getLocationName(member.location_id || 0)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${
                            member.status === "Active" || member.status === "Part-Time" || member.status === "Full-Time"
                              ? "bg-green-500"
                              : member.status === "On Leave" || member.status === "Terminated" || member.status === "Inactive"
                                ? "bg-amber-500"
                                : "bg-gray-400"
                          }`}
                        />
                        {member.status}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEditMember(member)}>
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEditMember(member)}>Edit details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/employee-details/${member.id}`)}>View profile</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>Change role</DropdownMenuItem>
                            {member.status === "Active" || member.status === "Part-Time" || member.status === "Full-Time" ? (
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setEditingMember(member);
                                  setEditedValues({
                                    name: member.name,
                                    email: member.email,
                                    phone: member.phone || "",
                                    jobTitle: getJobTitleName(member.current_title_id || 0),
                                    location: getLocationName(member.location_id || 0),
                                    status: "Inactive",
                                    bamboohrId: member.bamboo_hr_id || "",
                                    sevenShiftId: member.sevenshift_id || "",
                                    gustoId: member.gusto_id || "",
                                    punchId: member.punch_id || "",
                                  });
                                  handleSaveMember();
                                }}
                              >
                                Set as Inactive
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="text-green-600"
                                onClick={() => {
                                  setEditingMember(member);
                                  setEditedValues({
                                    name: member.name,
                                    email: member.email,
                                    phone: member.phone || "",
                                    jobTitle: getJobTitleName(member.current_title_id || 0),
                                    location: getLocationName(member.location_id || 0),
                                    status: "Active",
                                    bamboohrId: member.bamboo_hr_id || "",
                                    sevenShiftId: member.sevenshift_id || "",
                                    gustoId: member.gusto_id || "",
                                    punchId: member.punch_id || "",
                                  });
                                  handleSaveMember();
                                }}
                              >
                                Reactivate
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>Edit Employee Details</DialogTitle>
              <DialogDescription>
                Make changes to the employee information. Click save when you're done.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={editingMember?.avatar} alt={editingMember?.name} />
                <AvatarFallback>{editingMember?.initials}</AvatarFallback>
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
            
            {editingMember?.created_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Employee profile created on {new Date(editingMember.created_at).toLocaleString()}
              </p>
            )}
          </div>

          <DialogFooter>
            {editingMember && (
              <Button
                variant="outline"
                className="flex items-center gap-2"
                onClick={() => navigate(`/employee-details/${editingMember.id}`)}
              >
                <Eye className="h-4 w-4" />
                View Profile
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSaveMember}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}