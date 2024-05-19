---
title: 2. Addition Subtraction
---

## Commit log

```plaintext
Add + and - operators.
```

Commit 1中我们的一个超小型编译器只能编译一个整数。现在我们希望它可以编译一个简单的，支持加减法的表达式。

## 做法

我们现在希望chibicc可以这么来编译：

```shell
$ ./chibicc 54+32-10
```

那么就需要程序从左到右去扫描这个表达式，首先把54放到`rax`寄存器里面，遇见一个`+`号，再往后扫描一个整数，再执行一个`add`指令，遇见一个`-`号，再往后扫描一个整数，然后插入一个`sub`指令。

于是我们的`main.c`就可以这么写：

```c
#include <stdio.h>
#include <stdlib.h>

int main (int argc, char** argv) {
  if (argc != 2) {
    fprintf(stderr, "%s, invalid number of arguments.\n", argv[0]);
    return 1;
  }

  char *p = argv[1];

  printf("  .global main\n");
  printf("main:\n");
  printf("  mov $%ld, %%rax\n", strtol(p, &p, 10));
  while (*p) {
    if (*p == '+') {
      p++;
      printf("  add $%ld, %%rax\n", strtol(p, &p, 10));
      continue;
    }
    if (*p == '-') {
      p++;
      printf("  sub $%ld, %%rax\n", strtol(p, &p, 10));
      continue;
    }
    fprintf(stderr, "unexpected character: '%c'\n", *p);
    return 1;
  }  

  printf("  ret\n");
  return 0;
}
```

上面的代码也比较简单，不赘述了。只有一个`strtol`函数可能需要额外提一下，可参看((20220609111817-ip5tttm 'strtol'))。

然后稍稍修改test.sh，加一个测例即可：

## test.sh

```bash
assert 21 '5+20-4'
```

## 注意

此时的main.c还没有针对空格进行处理，因此千万不要在表达式上添加空格，否则会直接报错。

‍
