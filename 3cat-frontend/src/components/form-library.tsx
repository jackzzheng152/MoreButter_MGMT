import { Link } from "react-router-dom"
import { FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function FormLibrary() {
  const formCategories = [
    {
      id: "employee",
      name: "Employee Forms",
      forms: [
        {
          id: "satisfaction",
          title: "Employee Satisfaction Survey",
          description: "Measure team happiness and engagement",
          responses: 24,
          lastUpdated: "2 days ago",
        },
        {
          id: "feedback",
          title: "Performance Feedback",
          description: "Collect peer feedback for reviews",
          responses: 18,
          lastUpdated: "1 week ago",
        },
        {
          id: "onboarding",
          title: "New Hire Onboarding",
          description: "Checklist for new team members",
          responses: 5,
          lastUpdated: "3 days ago",
        },
      ],
    },
    {
      id: "training",
      name: "Training & Development",
      forms: [
        {
          id: "trainee",
          title: "Trainee Test",
          description: "Evaluate technical competencies",
          responses: 15,
          lastUpdated: "5 days ago",
        },
        {
          id: "barista",
          title: "Barista Test",
          description: "Evaluate technical competencies",
          responses: 12,
          lastUpdated: "2 weeks ago",
        },
      ],
    },
    {
      id: "compliance",
      name: "Compliance & HR",
      forms: [
        {
          id: "policy",
          title: "Policy Acknowledgment",
          description: "Confirm receipt of company policies",
          responses: 32,
          lastUpdated: "1 month ago",
        },
        {
          id: "incident",
          title: "Incident Report",
          description: "Document workplace incidents",
          responses: 3,
          lastUpdated: "3 weeks ago",
        },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Form Library</h2>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create New Form
        </Button>
      </div>

      <Tabs defaultValue="training" className="space-y-4">
        <TabsList>
          {formCategories.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {formCategories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {category.forms.map((form) => (
                 <Link key={form.id} to={`/forms/${form.id}`}>
                  <Card className="h-full transition-colors hover:bg-muted/50">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div className="rounded-full bg-muted px-2 py-1 text-xs">{form.responses} responses</div>
                      </div>
                      <CardTitle className="text-lg">{form.title}</CardTitle>
                      <CardDescription>{form.description}</CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2 text-xs text-muted-foreground">
                      Last updated: {form.lastUpdated}
                    </CardFooter>
                  </Card>
                </Link> 
              ))}

              <Card className="h-full border-dashed flex flex-col items-center justify-center p-6">
                <div className="rounded-full bg-muted p-3">
                  <Plus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-3 text-lg font-medium">Create New Form</h3>
                <p className="text-sm text-center text-muted-foreground mt-1">Add a new form to this category</p>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}

