---
title: 87. Array to Pointer Decay
---

## commit log

```plaintext
Decay an array to a pointer in the func param context
```

数组作为函数参数，要退化成指针。

## Parser

```c
static Type *func_params(Token **rest, Token *tok, Type *ty) {
  // code
  while (!equal(tok, ")")) {
    if (cur != &head)
      tok = skip(tok, ",");
    Type *ty2 = declspec(&tok, tok, NULL);
    ty2 = declarator(&tok, tok, ty2);
    // "array of T" is converted to "pointer to T" only in the parameter
    // context. For example, *argv[] is converted to **argv by this.
    if (ty2->kind == TY_ARRAY) {
      Token *name = ty2->name;
      ty2 = pointer_to(ty2->base);
      ty2->name = name; 
    }
    cur = cur->next = copy_type(ty2);
  }
  // code
}
```

## test

```c
// function.c
int param_decay(int x[]) { return x[0]; }

int main() {
  ASSERT(3, ({ int x[2]; x[0]=3; param_decay(x); }));
}
```
