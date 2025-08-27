

import { FormSubmissions } from "@/features/employee update/components/form-submissions"



export default function FormSubmissionsPage() {
  return (

      <div className="flex flex-col gap-6 p-6 md:gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Form Submissions</h1>
          <p className="text-muted-foreground">Review and approve employee update requests</p>
        </div>

        <FormSubmissions />
      </div>

  )
}
