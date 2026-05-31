import type { KcContext } from "../KcContext";

type Message = NonNullable<KcContext["message"]>;

export default function GlobalMessage({ message }: { message: Message }) {
    return (
        <div
            className={[
                "rounded-md border px-4 py-3 text-sm",
                message.type === "error" && "border-destructive/50 bg-destructive/10 text-destructive",
                message.type === "warning" && "border-yellow-500/50 bg-yellow-50 text-yellow-700",
                message.type === "success" && "border-green-500/50 bg-green-50 text-green-700",
                message.type === "info" && "border-border bg-muted text-muted-foreground"
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <span dangerouslySetInnerHTML={{ __html: message.summary }} />
        </div>
    );
}
