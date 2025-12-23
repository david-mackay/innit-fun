import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { formatDistanceToNow } from "date-fns";

interface StackCarouselProps {
  stacks: any[];
  initialIndex: number;
  onClose: () => void;
}

export function StackCarousel({ stacks, initialIndex, onClose }: StackCarouselProps) {
  // Map stacks to the format Lightbox expects (slides)
  // We can inject custom renderers if needed, but basic slides work well for images
  const slides = stacks.map((stack) => ({
    src: stack.mediaUrl,
    // Add custom metadata to the slide object to access it in the custom render function
    user: stack.user,
    createdAt: stack.createdAt,
    userId: stack.userId, // Fallback if user object is partial
  }));

  return (
    <Lightbox
      open={true}
      close={onClose}
      index={initialIndex}
      slides={slides}
      // Custom render for the "Header" / Slide Overlay to show User Info
      // We use the 'slide' prop in renderSlide or similar, or better yet, use the 'toolbar' render
      // to replace/add to the default toolbar.
      // However, a simpler way for this specific "title card" feel is to use the `render.slideFooter` or `render.slideHeader`
      render={{
        slideHeader: ({ slide }: { slide: any }) => (
            <div className="absolute top-0 left-0 right-0 p-4 z-50 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-3 pointer-events-auto">
                    <img 
                       src={slide.user?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${slide.userId}`}
                       className="w-10 h-10 rounded-full border border-white/20" 
                    />
                    <div className="text-left">
                      <p className="font-bold text-white text-sm shadow-black drop-shadow-md">
                        {slide.user?.displayName || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-300 shadow-black drop-shadow-md">
                        {formatDistanceToNow(new Date(slide.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                </div>
                {/* Close button is provided by Lightbox automatically, but we can add custom buttons if we want */}
            </div>
        )
      }}
      // Customize styles to match the "modal" feel
      styles={{
        container: { backgroundColor: "rgba(0, 0, 0, 0.95)" },
        root: { "--yarl__color_backdrop": "rgba(0, 0, 0, 0.95)" } as any
      }}
      // Enable common plugins if desired, but base is sufficient for now
      // controller={{ closeOnBackdropClick: true }}
    />
  );
}
