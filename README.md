# spinny-wheely-thing

A spinning wheel that randomly picks from a list of options.

> [!WARNING]
> This project was built almost entirely by an AI coding agent. It is **very** vibey. Tread accordingly.

## Usage

Options are driven by query parameters — share or bookmark a URL to preserve your list:

```
/?option=Pizza&option=Tacos&option=Sushi
```

Click **Edit** to manage options in the browser. The URL updates live, including `?edit=true` to reopen the dialog on reload.

## Dev

```sh
pnpm dev      # start dev server
pnpm build    # type-check + production build
pnpm preview  # serve the production build
```
