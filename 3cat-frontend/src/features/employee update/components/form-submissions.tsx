// src/components/FormSubmissions.tsx
"use client"

import { useState, useMemo } from "react"
import axios from 'axios'

import { CheckCircle, XCircle, AlertCircle, ChevronRight, Filter, Search, Clock, Loader } from "lucide-react"
import { Button } from "@/components/ui/button"
import { safeToFixed } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/hooks/use-toast"
import { CompensationChangeDetail } from "./CompensationChangeDetail"
import { 
  usePendingCompensations, 
  useApproveCompensation, 
  useDenyCompensation,
  CompensationChange 
} from "@/features/employee update/hooks/useCompensation"
import { useEmployees, Employee } from "@/features/employee update/hooks/useEmployees"

export function FormSubmissions() {
  const API_URL = import.meta.env.VITE_API_URL;
  const [activeTab, setActiveTab] = useState("pending")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterForm, setFilterForm] = useState("all")
  const [selectedChange, setSelectedChange] = useState<CompensationChange | null>(null)
  const [loadingProcess, setLoadingProcess] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);

  // Use the custom hooks to fetch data
  const { data: compensationChanges = [], isLoading: isLoadingCompensations, error: compensationsError } = usePendingCompensations();
  const { data: employees = [], isLoading: isLoadingEmployees, error: employeesError } = useEmployees();
  
  // Create a map of employee IDs to employee objects for quick lookup
  const employeeMap = useMemo(() => {
    const map = new Map<number, Employee>();
    employees.forEach(employee => {
      map.set(employee.id, employee);
    });
    return map;
  }, [employees]);

  console.log(employees)

  // Function to get employee full name
  const getEmployeeName = (employeeId: number) => {
    const employee = employeeMap.get(employeeId);
    if (employee) {
      return `${employee.first_name} ${employee.last_name}`;
    }
    return `Employee #${employeeId}`;
  };
  
  // Approve and deny mutations
  const { mutate: approveCompensation } = useApproveCompensation();
  const { mutate: denyCompensation } = useDenyCompensation();

  // Filter changes based on search query, form type, and status
  const filteredChanges = compensationChanges.filter((change) => {
    // Filter by status tab
    if (activeTab !== change.review_status) return false

    // Filter by form type (if applicable)
    if (filterForm !== "all" && change.form_id !== filterForm) return false

    // Filter by search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      const employee = employeeMap.get(change.employee_id);
      
      // Search by employee name, ID, or submitter name
      return (
        (employee && `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchLower)) ||
        String(change.employee_id).includes(searchLower) ||
        (change.submitter_name && change.submitter_name.toLowerCase().includes(searchLower)) ||
        (change.submission_id && change.submission_id.toLowerCase().includes(searchLower))
      )
    }

    return true
  })

  // Handle approve action
  const handleApprove = (change: CompensationChange) => {
    // You could get the current user's name from context or a auth store
    // For this example, I'll use a placeholder
    const currentUser = "Current User"; // Replace with actual user name or ID
    
    approveCompensation(
      { 
        changeId: change.id, 
        reviewer: currentUser 
      },
      {
        onSuccess: () => {
          toast({
            title: "Update Approved",
            description: `Compensation update for ${getEmployeeName(change.employee_id)} has been approved.`,
          });
          setSelectedChange(null);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: `Failed to approve the update: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: "destructive",
          });
        }
      }
    );
  }

  const handleDeny = (change: CompensationChange, notes: string) => {
    const currentUser = "Current User"; // Replace with actual user name or ID
    
    denyCompensation(
      { 
        changeId: change.id, 
        notes: notes,
        reviewer: currentUser 
      },
      {
        onSuccess: () => {
          toast({
            title: "Update Denied",
            description: `Compensation update for ${getEmployeeName(change.employee_id)} has been denied.`,
          });
          setSelectedChange(null);
        },
        onError: (error) => {
          toast({
            title: "Error",
            description: `Failed to deny the update: ${error instanceof Error ? error.message : 'Unknown error'}`,
            variant: "destructive",
          });
        }
      }
    );
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const isLoading = isLoadingCompensations || isLoadingEmployees;
  const error = compensationsError || employeesError;

  const handleProcessPendingCompensation = async () => {
    setLoadingProcess(true);
    try {
      const response = await axios.post(`${API_URL}/tally/compensation/pending/process`);
      const processedCount = response.data.processed_count || 0;
      toast({ title: "Success", description: `Processing triggered! Task is running in the background.` });
      
      // Show loader for only 3 seconds, then stop and show success
      setTimeout(() => {
        setLoadingProcess(false);
        setProcessingComplete(true);
        toast({ title: "Processing Complete", description: `Compensation processing has finished. ${processedCount} changes processed.` });
      }, 3000);
      
    } catch (err) {
      toast({ title: "Error", description: "Failed to trigger processing", variant: "destructive" });
      setLoadingProcess(false);
    }
  };

  if (isLoading) return <div>Loading data...</div>;
  if (error) return <div>Error loading data: {error instanceof Error ? error.message : 'Unknown error'}</div>;

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Compensation Update Requests</h2>
        <Button onClick={handleProcessPendingCompensation} variant="secondary" disabled={loadingProcess}>
          {loadingProcess ? (
            <Loader className="animate-spin mr-2 h-4 w-4" />
          ) : null}
          Process Pending Compensation
        </Button>
      </div>

      {selectedChange ? (
        <CompensationChangeDetail
          change={selectedChange}
          employee={employeeMap.get(selectedChange.employee_id)}
          onBack={() => setSelectedChange(null)}
          onApprove={handleApprove}
          onDeny={handleDeny}
        />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by employee name or submitter name..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {compensationChanges[0]?.form_id && (
              <Select value={filterForm} onValueChange={setFilterForm}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>{filterForm === "all" ? "All Forms" : "Compensation Update"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Forms</SelectItem>
                  <SelectItem value={compensationChanges[0].form_id}>Compensation Update</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
          
          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="justify-start w-full">
              <TabsTrigger value="pending">
                Pending
                <Badge variant="default" className="ml-2">
                  {compensationChanges.filter(c => c.review_status === "pending").length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="approved">
                Approved
                <Badge variant="default" className="ml-2">
                  {compensationChanges.filter(c => c.review_status === "approved").length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="denied">
                Denied
                <Badge variant="default" className="ml-2">
                  {compensationChanges.filter(c => c.review_status === "denied").length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4 w-full">
              {filteredChanges.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No pending submissions</h3>
                    <p className="text-muted-foreground mt-2">
                      There are no pending compensation update requests that match your filters.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredChanges.map((change) => (
                    <Card key={change.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            Compensation Update
                          </Badge>
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                            Pending Review
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{getEmployeeName(change.employee_id)}</CardTitle>
                        <CardDescription>
                          {change.submitter_name ? `Submitted by ${change.submitter_name}` : ""} 
                          on {formatDate(change.created_at)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">New Compensation</p>
                            <p className="text-sm text-muted-foreground">${safeToFixed(change.new_compensation)}/hr</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Effective Date</p>
                            <p className="text-sm text-muted-foreground">{new Date(change.effective_date).toLocaleDateString()}</p>
                          </div>
                          {change.position_name && (
                            <div>
                              <p className="text-sm font-medium">Position</p>
                              <p className="text-sm text-muted-foreground">{change.position_name}</p>
                            </div>
                          )}
                          {change.location_name && (
                            <div>
                              <p className="text-sm font-medium">Location</p>
                              <p className="text-sm text-muted-foreground">{change.location_name}</p>
                            </div>
                          )}
                          <div className="col-span-2">
                            <p className="text-sm font-medium">Reason</p>
                            <p className="text-sm text-muted-foreground">
                              {change.reason || "No reason provided"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2">
                        <Button
                          variant="ghost"
                          className="ml-auto flex items-center gap-1"
                          onClick={() => setSelectedChange(change)}
                        >
                          View Details
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4 w-full">
              {filteredChanges.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No approved submissions</h3>
                    <p className="text-muted-foreground mt-2">
                      There are no approved compensation update requests that match your filters.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredChanges.map((change) => (
                    <Card key={change.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            Compensation Update
                          </Badge>
                          <Badge variant="outline" className="bg-green-50 text-green-800 border-green-200">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Approved
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{getEmployeeName(change.employee_id)}</CardTitle>
                        <CardDescription>
                          {change.reviewed_by ? `Approved by ${change.reviewed_by}` : "Approved"} 
                          on {change.reviewed_at ? formatDate(change.reviewed_at) : formatDate(change.created_at)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">New Compensation</p>
                            <p className="text-sm text-muted-foreground">${safeToFixed(change.new_compensation)}/hr</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Effective Date</p>
                            <p className="text-sm text-muted-foreground">{new Date(change.effective_date).toLocaleDateString()}</p>
                          </div>
                          {change.position_name && (
                            <div>
                              <p className="text-sm font-medium">Position</p>
                              <p className="text-sm text-muted-foreground">{change.position_name}</p>
                            </div>
                          )}
                          {change.location_name && (
                            <div>
                              <p className="text-sm font-medium">Location</p>
                              <p className="text-sm text-muted-foreground">{change.location_name}</p>
                            </div>
                          )}
                          <div className="col-span-2">
                            <p className="text-sm font-medium">Processed Status</p>
                            <p className="text-sm text-muted-foreground">
                              {change.processed || processingComplete ? 
                                <span className="flex items-center text-green-600">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Processed
                                </span> : 
                                <span className="flex items-center text-amber-600">
                                  <Clock className="mr-1 h-3 w-3" />
                                  Pending Processing
                                </span>
                              }
                            </p>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2">
                        <Button
                          variant="ghost"
                          className="ml-auto flex items-center gap-1"
                          onClick={() => setSelectedChange(change)}
                        >
                          View Details
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="denied" className="space-y-4 w-full">
              {filteredChanges.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No denied submissions</h3>
                    <p className="text-muted-foreground mt-2">
                      There are no denied compensation update requests that match your filters.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredChanges.map((change) => (
                    <Card key={change.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                            Compensation Update
                          </Badge>
                          <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">
                            <XCircle className="mr-1 h-3 w-3" />
                            Denied
                          </Badge>
                        </div>
                        <CardTitle className="text-lg">{getEmployeeName(change.employee_id)}</CardTitle>
                        <CardDescription>
                          {change.reviewed_by ? `Denied by ${change.reviewed_by}` : "Denied"} 
                          on {change.reviewed_at ? formatDate(change.reviewed_at) : formatDate(change.created_at)}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-medium">New Compensation</p>
                            <p className="text-sm text-muted-foreground">${safeToFixed(change.new_compensation)}/hr</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Effective Date</p>
                            <p className="text-sm text-muted-foreground">{new Date(change.effective_date).toLocaleDateString()}</p>
                          </div>
                          {change.review_notes && (
                            <div className="col-span-2">
                              <p className="text-sm font-medium">Denial Reason</p>
                              <p className="text-sm text-muted-foreground bg-muted p-2 rounded-md mt-1">
                                {change.review_notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="pt-2">
                        <Button
                          variant="ghost"
                          className="ml-auto flex items-center gap-1"
                          onClick={() => setSelectedChange(change)}
                        >
                          View Details
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}