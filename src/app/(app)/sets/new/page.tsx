import PromptSetForm from "@/components/PromptSetForm";

export default function NewSetPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Tạo bộ prompt mới</h1>
      <PromptSetForm />
    </div>
  );
}
