

import { FormLibrary2 } from "@/components/form-library2"


export default function FormsPage() {
  return (

      <div className="flex flex-col gap-6 p-6 md:gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Forms & Surveys</h1>
          <p className="text-muted-foreground">Create, manage, and analyze forms and surveys for your team</p>
        </div>

        <FormLibrary2 />
      </div>

  )
}