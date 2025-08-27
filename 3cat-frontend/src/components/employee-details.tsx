import { AlertCircle, Calendar, Mail, MapPin, Phone, FileText } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

interface EmployeeDetailsProps {
  employee: {
    id: string
    name: string
    email: string
    phone: string
    jobTitle: string
    role: string
    status: string
    avatar: string
    initials: string
    location: string
    startDate: string
    manager: string
    bio: string
    skills: string[]
    documents: { name: string; date: string; type: string }[]
    schedule: {
      monday: string
      tuesday: string
      wednesday: string
      thursday: string
      friday: string
      saturday: string
      sunday: string
    }
    bamboohrId?: string
    sevenShiftId?: string
    gustoId?: string
    punchId?: string
    createdAt?: string
    quizResults?: {
      quizId: string
      quizName: string
      score: number
      passed: boolean
      completedDate: string
    }[]
  }
}

export function EmployeeDetails({ employee }: EmployeeDetailsProps) {
  // Check for missing critical information
  const missingGustoId = !employee.gustoId
  const missingBamboohrId = !employee.bamboohrId
  const missingSevenShiftId = !employee.sevenShiftId

  const hasMissingInfo = missingGustoId || missingBamboohrId || missingSevenShiftId

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {hasMissingInfo && (
        <div className="md:col-span-3">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <CardTitle>Missing Critical Information</CardTitle>
              </div>
              <CardDescription>
                The following information needs to be added to complete this employee's profile
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {missingGustoId && (
                  <div className="flex items-start gap-2 p-3 bg-white rounded-md border border-red-100">
                    <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Gusto ID Missing</h4>
                      <p className="text-sm text-muted-foreground">Employee cannot be processed in payroll system</p>
                    </div>
                  </div>
                )}
                {missingBamboohrId && (
                  <div className="flex items-start gap-2 p-3 bg-white rounded-md border border-amber-100">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">BambooHR ID Missing</h4>
                      <p className="text-sm text-muted-foreground">Employee record is incomplete</p>
                    </div>
                  </div>
                )}
                {missingSevenShiftId && (
                  <div className="flex items-start gap-2 p-3 bg-white rounded-md border border-amber-100">
                    <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium">7shift ID Missing</h4>
                      <p className="text-sm text-muted-foreground">Employee cannot be scheduled properly</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="md:col-span-1">
        <CardHeader className="flex flex-col items-center text-center">
          <Avatar className="h-24 w-24">
            <AvatarImage src={employee.avatar} alt={employee.name} />
            <AvatarFallback className="text-2xl">{employee.initials}</AvatarFallback>
          </Avatar>
          <CardTitle className="mt-4 text-xl">{employee.name}</CardTitle>
          <CardDescription>{employee.role}</CardDescription>
          <Badge variant="outline" className="mt-2">
            {employee.status}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{employee.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{employee.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{employee.location} Store</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Started {new Date(employee.startDate).toLocaleDateString()}</span>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Job Title</h3>
              <p className="text-sm text-muted-foreground">{employee.jobTitle}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Reports To</h3>
              <p className="text-sm text-muted-foreground">{employee.manager}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Skills</h3>
              <div className="flex flex-wrap gap-1">
                {employee.skills.map((skill) => (
                  <Badge key={skill} variant="default" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h3 className="text-sm font-medium">System IDs</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BambooHR ID:</span>
                  {employee.bamboohrId ? (
                    <span>{employee.bamboohrId}</span>
                  ) : (
                    <span className="text-red-500 font-medium">Missing</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">7shift ID:</span>
                  {employee.sevenShiftId ? (
                    <span>{employee.sevenShiftId}</span>
                  ) : (
                    <span className="text-red-500 font-medium">Missing</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gusto ID:</span>
                  {employee.gustoId ? (
                    <span>{employee.gustoId}</span>
                  ) : (
                    <span className="text-red-500 font-medium">Missing</span>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Punch ID:</span>
                  {employee.punchId ? (
                    <span>{employee.punchId}</span>
                  ) : (
                    <span className="text-amber-500 font-medium">Missing</span>
                  )}
                </div>
              </div>
            </div>

            {employee.createdAt && (
              <div className="mt-4 pt-4 border-t text-xs text-muted-foreground">
                Profile created on {new Date(employee.createdAt).toLocaleString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{employee.bio}</p>
          </CardContent>
        </Card>

        <Tabs defaultValue="schedule" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="schedule" className="flex-1">
              Schedule
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex-1">
              Documents
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              Employment History
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="flex-1">
              Training & Quizzes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="schedule">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription>Current work schedule for {employee.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(employee.schedule).map(([day, hours]) => (
                    <div key={day} className="flex justify-between py-1 border-b last:border-0">
                      <span className="font-medium capitalize">{day}</span>
                      <span className="text-muted-foreground">{hours}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="documents">
            <Card>
              <CardHeader>
                <CardTitle>Employee Documents</CardTitle>
                <CardDescription>Important documents and forms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {employee.documents.map((doc) => (
                    <div key={doc.name} className="flex justify-between items-center py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Added on {new Date(doc.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">{doc.type}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Employment History</CardTitle>
                <CardDescription>Position and role changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="relative">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border bg-background">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div className="absolute bottom-0 left-1/2 top-8 w-px -translate-x-1/2 bg-border" />
                    </div>
                    <div className="space-y-1 pb-8">
                      <p className="text-sm font-medium">Joined as {employee.role}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(employee.startDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Started at {employee.location} location in the {employee.jobTitle} department.
                      </p>
                    </div>
                  </div>
                  {/* Add more history items as needed */}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="quizzes">
            <Card>
              <CardHeader>
                <CardTitle>Training Progress</CardTitle>
                <CardDescription>Quiz results and certification status</CardDescription>
              </CardHeader>
              <CardContent>
                {employee.quizResults && employee.quizResults.length > 0 ? (
                  <div className="space-y-4">
                    {employee.quizResults.map((result, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">{result.quizName}</p>
                          <p className="text-xs text-muted-foreground">
                            Completed on {new Date(result.completedDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">Score: {result.score}%</div>
                          <Badge
                            variant={result.passed ? "outline" : "destructive"}
                            className={result.passed ? "bg-green-50 text-green-800 border-green-200" : ""}
                          >
                            {result.passed ? "Passed" : "Failed"}
                          </Badge>
                        </div>
                      </div>
                    ))}

                    {employee.jobTitle !== "Store Manager" && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h4 className="font-medium text-blue-800">Next Certification</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          {employee.jobTitle === "Trainee" && "Complete Barista Basics Quiz to be promoted to Barista"}
                          {employee.jobTitle === "Barista" &&
                            "Complete Advanced Drink Making Quiz to be promoted to Barista Trainer I"}
                          {employee.jobTitle === "Barista Trainer I" &&
                            "Complete Training Techniques Quiz to be promoted to Barista Trainer II"}
                          {employee.jobTitle === "Barista Trainer II" &&
                            "Complete Management Basics Quiz to be promoted to Shift Lead"}
                          {employee.jobTitle === "Shift Lead" &&
                            "Complete Store Operations Quiz to be promoted to Store Manager"}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">No quiz results yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      This employee hasn't completed any training quizzes.
                    </p>
                    <Button className="mt-4" variant="outline">
                      Assign Quiz
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
