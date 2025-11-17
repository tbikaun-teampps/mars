export function Stepheader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex-1 border-t border-gray-300" />
      <h3 className="text-md font-semibold whitespace-nowrap">
        {title}
      </h3>
      <div className="flex-1 border-t border-gray-300" />
    </div>
  );
}
