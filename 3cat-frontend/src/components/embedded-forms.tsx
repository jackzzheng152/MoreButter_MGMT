// "use client"

// import { useState } from "react"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// export function EmbeddedForms() {
//   const [activeTab, setActiveTab] = useState("employee-satisfaction")

//   return (
//     <Card className="col-span-3">
//       <CardHeader>
//         <CardTitle>Forms & Surveys</CardTitle>
//         <CardDescription>Embedded forms and quizzes for your team</CardDescription>
//       </CardHeader>
//       <CardContent>
//         <Tabs defaultValue="employee-satisfaction" className="space-y-4" onValueChange={setActiveTab}>
//           <TabsList>
//             <TabsTrigger value="employee-satisfaction">Employee Satisfaction</TabsTrigger>
//             <TabsTrigger value="onboarding-quiz">Onboarding Quiz</TabsTrigger>
//             <TabsTrigger value="training-feedback">Training Feedback</TabsTrigger>
//           </TabsList>
//           <TabsContent value="employee-satisfaction" className="border rounded-lg p-4">
//             <div className="aspect-video w-full">
//               <iframe
//                 src="https://tally.so/embed/mRDLRd?alignLeft=1&hideTitle=1&transparentBackground=1"
//                 className="w-full h-[500px] border-0"
//                 title="Employee Satisfaction Survey"
//               ></iframe>
//             </div>
//           </TabsContent>
//           <TabsContent value="onboarding-quiz" className="border rounded-lg p-4">
//             <div className="aspect-video w-full">
//               <iframe
//                 src="https://tally.so/embed/3yP5Vd?alignLeft=1&hideTitle=1&transparentBackground=1"
//                 className="w-full h-[500px] border-0"
//                 title="Onboarding Quiz"
//               ></iframe>
//             </div>
//           </TabsContent>
//           <TabsContent value="training-feedback" className="border rounded-lg p-4">
//             <div className="aspect-video w-full">
//               <iframe
//                 src="https://tally.so/embed/3ExVLj?alignLeft=1&hideTitle=1&transparentBackground=1"
//                 className="w-full h-[500px] border-0"
//                 title="Training Feedback Form"
//               ></iframe>
//             </div>
//           </TabsContent>
//         </Tabs>
//       </CardContent>
//     </Card>
//   )
// }

