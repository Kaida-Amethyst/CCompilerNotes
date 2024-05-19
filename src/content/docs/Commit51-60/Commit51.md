---
title: 51. Variable Alignment
---

## commit log

```plaintext
Align local variables.
```

实际上，在一个函数的内部，局部变量也是存在align的。

例如：

```c
{
  int x;
  int y;
  char z;
}
//内部格局可能是：
// |----|----|---|-|
//    x    y      z
// z前面有三个空字节
// &z - &y = 7
```

## codegen

修改codegen即可。

```c
static void assign_lvar_offsets(Obj *prog) {
  for(Obj *fn = prog; fn; fn = fn->next) {
    if (!fn->is_function)
      continue;

    int offset = 0;
    for (Obj *var = fn->locals; var; var = var->next) {
      offset += var->ty->size;
      offset = align_to(offset, var->ty->align);
      var->offset = - offset;
    }
    fn->stack_size = align_to(offset, 16);
  }
}
```

## test

修改variable.c，添加以下测例：

```c
ASSERT(15, ({ int x; int y; char z; char *a=&y; char *b=&z; b-a; }));
ASSERT(1, ({ int x; char y; int z; char *a=&y; char *b=&z; b-a; }));
```

‍
