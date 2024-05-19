---
title: 56. Int Size Change
---

## commit log

```plaintext
Change size of int from 8 to 4
```

 之前我们的int都是8字节，但是实际上的C语言中，int类型都是4字节，这一次我们来将其修改。

## type.c

首先需要修改type.c文件，把`int`的大小修改一下：

```c
Type *ty_int = &(Type){TY_INT, 4, 4};
```

## codegen

然后就是修改codegen的部分了，注意这个时候我们需要引入4字节寄存器：

```c
static char *argreg32[] = {"%edi"， "%esi", "%edx", "%ecx", "r8d", "%r9d"};
```

然后需要修改load和store函数：

```c
static void load(Type *ty) {
  /* other code */

  if (ty->size == 1) {
    println("  movsbq (%%rax), %%rax");
  } else if (ty->size == 4) {
    println("  movsxd (%%rax), %%rax");
  } else {
    println("  mov (%%rax), %%rax");
  }
}

static void store(Type *ty) {
  /*  other code  */
  if (ty->size == 1) {
    println("  mov %%al, (%%rdi)");
  } else if (ty->size == 4) {
    println("  mov %%eax, (%%rdi)");
  } else {
    println("  mov %%rax, (%%rdi)");
  }
}
```

这个是常规的`load`和`store`，但是对于函数来说，也需要考虑store的问题，这里需要修改`emit_text`函数：

```c
static void emit_text(Obj *prog) {
  /*  code  */
  int i = 0
  for(Obj *var = fn->params; var; var = var->next) 
    store_gp(i++, var->offset, var->ty->size)
  /*  code  */
}
```

然后我们来实现这个`store_gp`：

```c
static void store_gp(int r, int offset, int sz) {
  switch (sz) {
    case 1:
      println("  mov %s, %d(%%rbp)", argreg8[r], offset);
      return;
    case 4:
      println("  mov %s, %d(%%rbp)", argreg32[r], offset);
      return ;
    case 8:
      println("  mov %s, %d(%%rbp)", argreg64[r], offset);
      return ;
  }
  unreachable();
}
```

注意这里我们用了一个`unreachable`，这是一个宏，我们把这个宏写到头文件里面：

```c
#define unreachable() \
  error("internal error at %s:%d", __FILE__, __LINE__)
```

## test.sh

最后修改测例，把涉及到`int`大小的测例全部修改即可。

‍
