import { Container } from '@/components/layout/PageHeader'
import { CardSkeleton, Skeleton } from '@/components/ui/States'

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="bg-night">
        <Container className="pb-10 pt-8">
          <Skeleton className="h-3 w-28 bg-white/10" />
          <Skeleton className="mt-4 h-10 w-3/4 max-w-md bg-white/10" />
          <Skeleton className="mt-3 h-10 w-1/2 max-w-xs bg-white/10" />
        </Container>
      </div>
      <Container className="grid gap-3 py-8 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </Container>
    </div>
  )
}
