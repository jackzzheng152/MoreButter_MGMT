
import { PayrollProcessor } from "@/features/payroll processing/components/payroll-processor"



export default function PayrollPage() {
  return (

      <div className="flex flex-col gap-6 p-6 md:gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Payroll Processing</h1>
          <p className="text-muted-foreground">
            Process payroll for all boba shop staff and export to your payroll system
          </p>
        </div>

        <PayrollProcessor />
      </div>

  )
}
