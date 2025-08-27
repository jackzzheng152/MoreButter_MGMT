// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// import { useEffect, useState } from "react"

// import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Employee } from "@/features/payroll processing/types/employees"

// export function TeamOverview() {
//   const [employees, setEmployees] = useState<Employee[]>([])
//   const [loading, setLoading] = useState(true)
//   const [error, setError] = useState<string | null>(null)
//   const [selectedFruit, setSelectedFruit] = useState<string>("")


//   useEffect(() => {
//     const fetchEmployees = async () => {
//       try {
//         const response = await fetch('http://localhost:8000/employees')
//         if (!response.ok) throw new Error('Failed to fetch employees')
//         const data = await response.json()
//         setEmployees(data)
//         console.log(data)
//       } catch (err) {
//         setError(err instanceof Error ? err.message : 'Failed to fetch employees')
//       } finally {
//         setLoading(false)
//       }
//     }

//     fetchEmployees()
//   }, [])

//   if (loading) return <div>Loading...</div>
//   if (error) return <div>Error: {error}</div>


//   return (
//     <Card className="col-span-1">
//       <CardHeader>
//         <CardTitle>Team Overview</CardTitle>
//         <CardDescription>Your team's current status</CardDescription>
//       </CardHeader>
//       <CardContent>
//         {/* <Select>
//         <Select
//           value={selectedFruit}
//           onValueChange={(val) => setSelectedFruit(val)}
//         >
//           <SelectTrigger className="w-[180px]">
//             <SelectValue placeholder="Select a fruit" />
//           </SelectTrigger>
//           <SelectContent position="popper">
//             <SelectGroup>
//               <SelectLabel>Fruits</SelectLabel>
//               <SelectItem value="apple">Apple</SelectItem>
//               <SelectItem value="banana">Banana</SelectItem>
//               <SelectItem value="blueberry">Blueberry</SelectItem>
//               <SelectItem value="grapes">Grapes</SelectItem>
//               <SelectItem value="pineapple">Pineapple</SelectItem>
//             </SelectGroup>
//           </SelectContent>
//         </Select> */}
//         <Select
//           value={selectedFruit}
//           onValueChange={(val) => setSelectedFruit(val)}
//         >
//           <SelectTrigger className="w-[180px]">
//             <SelectValue placeholder="Select a fruit">
//               {selectedFruit && selectedFruit.charAt(0).toUpperCase() + selectedFruit.slice(1)}
//             </SelectValue>
//           </SelectTrigger>
//           <SelectContent position="popper">
//             <SelectGroup>
//               <SelectLabel>Fruits</SelectLabel>
//               <SelectItem value="apple">Apple</SelectItem>
//               <SelectItem value="banana">Banana</SelectItem>
//               <SelectItem value="blueberry">Blueberry</SelectItem>
//               <SelectItem value="grapes">Grapes</SelectItem>
//               <SelectItem value="pineapple">Pineapple</SelectItem>
//             </SelectGroup>
//           </SelectContent>
//         </Select>

//         <div className="space-y-4">
//           {employees.map((employee) => {
//             const fullName = `${employee.first_name ?? ''} ${employee.last_name ?? ''}`.trim()
//             const initials = `${employee.first_name?.charAt(0) ?? ''}${employee.last_name?.charAt(0) ?? ''}`.toUpperCase()

//             return (
//               <div key={employee.employee_id} className="flex items-center gap-4">
//                 <Avatar className="h-8 w-8">
//                   <AvatarImage src={"/placeholder.svg?height=32&width=32"} alt={fullName} />
//                   <AvatarFallback>{initials}</AvatarFallback>
//                 </Avatar>
//                 <div className="flex-1 space-y-1">
//                   <p className="text-sm font-medium leading-none">{fullName}</p>
//                   <p className="text-xs text-muted-foreground">{employee.department}</p>
//                 </div>
//                 <div className="flex items-center gap-1">
//                   <div className="h-2 w-2 rounded-full bg-green-500" />
//                   <span className="text-xs text-muted-foreground">Active</span>
//                 </div>
//               </div>
//             )
//           })}
//         </div>
//       </CardContent>
//     </Card>
//   )
// }

