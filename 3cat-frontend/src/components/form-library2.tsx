import { useState } from "react"
import { FileText, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"



export function FormLibrary2() {
    interface Form {
    id: string;
    title: string;
    description: string;
    responses: number;
    lastUpdated: string;
    tallyUrl: string;
    }
  const [selectedForm, setSelectedForm] = useState<Form | null>(null)
  
  // Base embed URL with your parameters
  const baseEmbedUrl = "https://tally.so/embed/3X2j0d?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
  
  const formCategories = [
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
          tallyUrl: baseEmbedUrl,
        },
        {
          id: "barista",
          title: "Barista Test",
          description: "Evaluate technical competencies",
          responses: 12,
          lastUpdated: "2 weeks ago",
          tallyUrl: baseEmbedUrl,
        },
      ],
    }
  ]

  const handleFormClick = (form: any) => {
    setSelectedForm(form)
  }

  const closeForm = () => {
    setSelectedForm(null)
  }

  return (
    <div className="space-y-6">
      {selectedForm ? (
        <div className="fixed inset-0 bg-background/95 z-50 flex flex-col p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{selectedForm.title}</h2>
            <Button variant="ghost" size="icon" onClick={closeForm}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 bg-card rounded-lg shadow-lg overflow-hidden">
            <iframe
              src={selectedForm.tallyUrl}
              frameBorder="0"
              width="100%"
              height="100%"
              title={selectedForm.title}
              style={{ border: "none" }}
              allow="camera; microphone; autoplay; encrypted-media; fullscreen; geolocation"
            />
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Form Library</h2>
            <Button onClick={() => window.open("https://tally.so/dashboard/new", "_blank")}>
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
                    <div key={form.id} onClick={() => handleFormClick(form)} className="cursor-pointer">
                      <Card className="h-full transition-colors hover:bg-muted/50">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="rounded-full bg-muted px-2 py-1 text-xs">
                              {form.responses} responses
                            </div>
                          </div>
                          <CardTitle className="text-lg">{form.title}</CardTitle>
                          <CardDescription>{form.description}</CardDescription>
                        </CardHeader>
                        <CardFooter className="pt-2 text-xs text-muted-foreground">
                          Last updated: {form.lastUpdated}
                        </CardFooter>
                      </Card>
                    </div>
                  ))}

                  <div 
                    onClick={() => window.open("https://tally.so/dashboard/new", "_blank")}
                    className="cursor-pointer"
                  >
                    <Card className="h-full border-dashed flex flex-col items-center justify-center p-6 hover:bg-muted/30 transition-colors">
                      <div className="rounded-full bg-muted p-3">
                        <Plus className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="mt-3 text-lg font-medium">Create New Form</h3>
                      <p className="text-sm text-center text-muted-foreground mt-1">
                        Add a new quiz or form using Tally
                      </p>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  )
}