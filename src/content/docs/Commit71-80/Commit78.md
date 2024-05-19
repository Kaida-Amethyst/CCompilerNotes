---
title: 78. Pre-Increment Decrement
---

## commit log

```plaintext
Add pre ++ and --
```

支持前置的`++`和`--`操作。

将其视为一个unary操作符即可。

## Lexer

```c
static int read_punct(char *p) {
  static char *kw[] = {
    "==", "!=", "<=", ">=", "->", "+=", "-=", "*=", "/=", "++", "--",
  };
  // code
}
```

## Parser

```c
static Node *unary(Token **rest, Token *tok) {
  // other cases

  if (equal(tok, "++"))
    return to_assign(new_add(unary(rest, tok->next), new_num(1, tok), tok));

  if (equal(tok, "--"))
    return to_assign(new_sub(unary(rest, tok->next), new_num(1, tok), tok));

  return posifix(rest, tok);
}
```

## test

```c
// arith.c
int main() {
  ASSERT(3, ({ int i=2; ++i; }));
  ASSERT(2, ({ int a[3]; a[0]=0; a[1]=1; a[2]=2; int *p=a+1; ++*p; }));
  ASSERT(0, ({ int a[3]; a[0]=0; a[1]=1; a[2]=2; int *p=a+1; --*p; }));
}
// sizeof.c
int main() {
  ASSERT(1, ({ char i; sizeof(++i); }));
}
```
